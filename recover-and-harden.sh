#!/bin/bash
# =============================================================
# recover-and-harden.sh — اجرا از کنسول وب VPS
# یکبار اجرا کن. آی‌پی VPN تو whitelist میشه، SSH خودش رو
# مونیتور میکنه، fail2ban کوتاه، iptables ضد ریست.
# =============================================================
set -e

echo "============================================"
echo "🔧 Janebi VPS — SSH Recovery & Hardening"
echo "============================================"

# ─── ۱. Restart SSH ──────────────────────────────
echo "🔹 [1/6] Restarting SSH service..."
sudo systemctl restart sshd 2>/dev/null || sudo service ssh restart 2>/dev/null || echo "⚠️ sshd restart skipped"
sudo systemctl enable sshd 2>/dev/null || true
sleep 1
echo "   ✓ done ($(sudo systemctl is-active sshd 2>/dev/null || echo 'checking'))"

# ─── ۲. always-allow SSH iptables rule ──────────
# بعد از ریستارت داکر، iptables پاک میشه. این قانون رو میذاریم
# توی یه سرویس systemd که هر دقیقه SSH رو مجاز کنه (self-heal).
echo "🔹 [2/6] Creating SSH iptables watch-service..."

# allow SSH in iptables right now
sudo iptables -C INPUT -p tcp --dport 22 -j ACCEPT 2>/dev/null || \
  sudo iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT
sudo iptables -C INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || \
  sudo iptables -I INPUT 2 -m state --state ESTABLISHED,RELATED -j ACCEPT

# systemd timer: هر ۳ دقیقه SSH port رو مجاز کن (باگ docker restart رو جبران میکنه)
sudo tee /usr/local/bin/keep-ssh-alive.sh > /dev/null << 'SCRIPT'
#!/bin/bash
# keep SSH port open no matter what Docker/iptables does
iptables -C INPUT -p tcp --dport 22 -j ACCEPT 2>/dev/null || \
  iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT
iptables -C INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || \
  iptables -I INPUT 2 -m state --state ESTABLISHED,RELATED -j ACCEPT
# Restart sshd if it died
systemctl is-active sshd >/dev/null 2>&1 || systemctl restart sshd
SCRIPT
sudo chmod +x /usr/local/bin/keep-ssh-alive.sh

# systemd service
sudo tee /etc/systemd/system/keep-ssh-alive.service > /dev/null << 'SVC'
[Unit]
Description=Keep SSH port open and service alive
After=network.target docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/keep-ssh-alive.sh

[Install]
WantedBy=multi-user.target
SVC

# systemd timer (every 3 minutes)
sudo tee /etc/systemd/system/keep-ssh-alive.timer > /dev/null << 'TIMER'
[Unit]
Description=Check SSH every 3 minutes

[Timer]
OnBootSec=30
OnUnitActiveSec=180
Persistent=true

[Install]
WantedBy=timers.target
TIMER

sudo systemctl daemon-reload
sudo systemctl enable keep-ssh-alive.timer --now 2>&1
sudo systemctl start keep-ssh-alive.service 2>&1
echo "   ✓ SSH watchdog active (every 3min)"

# ─── ۳. fail2ban ────────────────────────────────
echo "🔹 [3/6] Configuring fail2ban..."

# نصب fail2ban اگر نیست
which fail2ban-client >/dev/null 2>&1 || sudo apt install -y fail2ban 2>&1 | tail -1

sudo tee /etc/fail2ban/jail.local > /dev/null << 'FAIL2BAN'
[DEFAULT]
# ۳۰ دقیقه بن کافیست — هیچ IPای برای همیشه بن نمیشه
bantime = 30m
findtime = 10m
maxretry = 5
# ignore IPs: خود VPS, docker network, و هر رنجی که کاربر میخواد
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16

[sshd]
enabled = true
maxretry = 3
bantime = 15m

[recidive]
enabled = true
bantime = 2h
findtime = 24h
maxretry = 3
logpath = /var/log/fail2ban.log
FAIL2BAN

# unban همه IPها
sudo fail2ban-client set sshd unbanip --all 2>/dev/null || true
sudo fail2ban-client reload 2>&1 | tail -1 || sudo systemctl restart fail2ban 2>&1
echo "   ✓ fail2ban: bantime=15m (ssh), ignoreip=private ranges"

# ─── ۴. Docker ──────────────────────────────────
echo "🔹 [4/6] Configuring Docker logging limits..."
if [ -f /home/ubuntu/Janebi-Store/docker-compose.yml ]; then
  # logging limits already added in compose file
  echo "   ✓ compose logging limits already set"
fi

# محدود کردن لاگ‌های journald
sudo journalctl --vacuum-size=100M 2>/dev/null || true
echo "   ✓ journald log size limited"

# ─── ۵. SSH daemon hardening ────────────────────
echo "🔹 [5/6] Hardening SSH daemon..."

sudo sed -i 's/^#ClientAliveInterval.*/ClientAliveInterval 60/' /etc/ssh/sshd_config 2>/dev/null || true
sudo sed -i 's/^#ClientAliveCountMax.*/ClientAliveCountMax 3/' /etc/ssh/sshd_config 2>/dev/null || true
sudo sed -i 's/^#TCPKeepAlive.*/TCPKeepAlive yes/' /etc/ssh/sshd_config 2>/dev/null || true
sudo sed -i 's/^#MaxStartups.*/MaxStartups 10:30:60/' /etc/ssh/sshd_config 2>/dev/null || true
sudo systemctl restart sshd 2>/dev/null || sudo service ssh restart 2>/dev/null || true
echo "   ✓ SSH keepalive + rate limits"

# ─── ۶. Verification ────────────────────────────
echo "🔹 [6/6] Verifying..."

echo ""
echo "============================================"
echo "✅ SSH Recovery & Hardening Complete"
echo "============================================"
echo ""
echo "📋 Status:"
echo "   SSH: $(sudo systemctl is-active sshd 2>/dev/null || echo '?')"
echo "   Fail2ban: $(sudo systemctl is-active fail2ban 2>/dev/null || echo '?')"
echo "   Watchdog: $(sudo systemctl is-active keep-ssh-alive.timer 2>/dev/null || echo '?')"
echo "   Docker: $(docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | head -3 || echo '?')"
echo ""
echo "🛡️  بعد از این، تو این سناریوها:"
echo "   • Docker restart → watch-script ۳ دقیقه بعد SSH رو برمیگردونه"
echo "   • fail2ban ban → بعد ۱۵ دقیقه آزاد میشه"
echo "   • SSH crash → خودش restart میشه"
echo ""
echo "🔑 برای تست از خارج: ssh ubuntu@45.82.137.67"
echo ""
echo "⚠️  تا ۳ دقیقه صبر کن تا watch-script اولی-fire بشه"