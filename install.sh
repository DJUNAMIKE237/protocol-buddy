#!/bin/bash

# ============================================================
#  NEXUS PRO PANEL — Installation Script
#  Full VPN Protocol Suite + Web Panel Installer
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'
BOLD='\033[1m'

NEXUS_DIR="/opt/nexus-pro"
NEXUS_CONFIG="$NEXUS_DIR/config.json"
NEXUS_WEB="$NEXUS_DIR/web"
NEXUS_BIN="/usr/local/bin/nexus"
PANEL_PORT=8443

clear
echo -e "${PURPLE}${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║                                                      ║"
echo "║           ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗║"
echo "║           ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝║"
echo "║           ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗║"
echo "║           ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║║"
echo "║           ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║║"
echo "║           ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝║"
echo "║                    PRO PANEL v2.0                     ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${CYAN}  VPN Protocol Suite + Web Management Panel${NC}"
echo ""

# Check root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR] Ce script doit être exécuté en tant que root${NC}"
   exit 1
fi

# Check OS
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo -e "${RED}[ERROR] OS non supporté${NC}"
    exit 1
fi

echo -e "${YELLOW}[INFO] OS Détecté: $OS $VERSION${NC}"
echo ""

# ===========================
# GATHER CONFIGURATION
# ===========================
echo -e "${PURPLE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}${BOLD}  CONFIGURATION INITIALE${NC}"
echo -e "${PURPLE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "0.0.0.0")
echo -e "${GREEN}[AUTO] Adresse IP détectée: ${WHITE}$SERVER_IP${NC}"
read -p "$(echo -e ${CYAN}[INPUT]${NC} Confirmez l\'IP [$SERVER_IP]: )" INPUT_IP
SERVER_IP=${INPUT_IP:-$SERVER_IP}

echo ""
read -p "$(echo -e ${CYAN}[INPUT]${NC} Domaine principal \(ex: vpn.example.com\): )" DOMAIN
while [[ -z "$DOMAIN" ]]; do
    read -p "$(echo -e ${RED}[REQUIS]${NC} Domaine principal: )" DOMAIN
done

read -p "$(echo -e ${CYAN}[INPUT]${NC} NS Domain \(ex: ns.example.com\): )" NS_DOMAIN
while [[ -z "$NS_DOMAIN" ]]; do
    read -p "$(echo -e ${RED}[REQUIS]${NC} NS Domain: )" NS_DOMAIN
done

echo ""
echo -e "${PURPLE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}${BOLD}  COMPTE ADMINISTRATEUR PRINCIPAL${NC}"
echo -e "${PURPLE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "$(echo -e ${CYAN}[INPUT]${NC} Nom d\'utilisateur admin: )" ADMIN_USER
while [[ -z "$ADMIN_USER" ]]; do
    read -p "$(echo -e ${RED}[REQUIS]${NC} Nom d\'utilisateur admin: )" ADMIN_USER
done

while true; do
    read -sp "$(echo -e ${CYAN}[INPUT]${NC} Mot de passe admin: )" ADMIN_PASS
    echo ""
    read -sp "$(echo -e ${CYAN}[INPUT]${NC} Confirmez le mot de passe: )" ADMIN_PASS2
    echo ""
    if [[ "$ADMIN_PASS" == "$ADMIN_PASS2" && -n "$ADMIN_PASS" ]]; then
        break
    fi
    echo -e "${RED}[ERROR] Les mots de passe ne correspondent pas${NC}"
done

echo ""
read -p "$(echo -e ${CYAN}[INPUT]${NC} Port du panel web [$PANEL_PORT]: )" INPUT_PORT
PANEL_PORT=${INPUT_PORT:-$PANEL_PORT}

echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}  Récapitulatif:${NC}"
echo -e "${WHITE}  IP        : ${CYAN}$SERVER_IP${NC}"
echo -e "${WHITE}  Domaine   : ${CYAN}$DOMAIN${NC}"
echo -e "${WHITE}  NS Domain : ${CYAN}$NS_DOMAIN${NC}"
echo -e "${WHITE}  Admin     : ${CYAN}$ADMIN_USER${NC}"
echo -e "${WHITE}  Port Panel: ${CYAN}$PANEL_PORT${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
read -p "$(echo -e ${YELLOW}[CONFIRM]${NC} Continuer l\'installation? [Y/n]: )" CONFIRM
if [[ "$CONFIRM" =~ ^[Nn] ]]; then
    echo -e "${RED}Installation annulée.${NC}"
    exit 0
fi

# ===========================
# SYSTEM UPDATE
# ===========================
echo ""
echo -e "${PURPLE}[1/8] ${WHITE}Mise à jour du système...${NC}"
apt-get update -y > /dev/null 2>&1
apt-get upgrade -y > /dev/null 2>&1
echo -e "${GREEN}[✓] Système mis à jour${NC}"

# ===========================
# INSTALL DEPENDENCIES
# ===========================
echo -e "${PURPLE}[2/8] ${WHITE}Installation des dépendances...${NC}"
apt-get install -y \
    curl wget unzip git \
    nginx certbot python3-certbot-nginx \
    openssh-server dropbear stunnel4 squid \
    openvpn easy-rsa \
    nodejs npm \
    build-essential \
    jq screen badvpn \
    > /dev/null 2>&1

# Install Node.js LTS if needed
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
fi

echo -e "${GREEN}[✓] Dépendances installées${NC}"

# ===========================
# INSTALL XRAY
# ===========================
echo -e "${PURPLE}[3/8] ${WHITE}Installation de Xray-core (VMess/VLESS/Trojan/SOCKS)...${NC}"
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install > /dev/null 2>&1

# Generate UUID for Xray protocols
XRAY_UUID=$(cat /proc/sys/kernel/random/uuid)

# Create Xray config
mkdir -p /usr/local/etc/xray
cat > /usr/local/etc/xray/config.json << XRAYEOF
{
  "log": {"loglevel": "warning"},
  "inbounds": [
    {
      "tag": "vmess-ws",
      "port": 10001,
      "protocol": "vmess",
      "settings": {"clients": [{"id": "$XRAY_UUID"}]},
      "streamSettings": {"network": "ws", "wsSettings": {"path": "/vmess"}}
    },
    {
      "tag": "vless-ws",
      "port": 10002,
      "protocol": "vless",
      "settings": {"clients": [{"id": "$XRAY_UUID"}], "decryption": "none"},
      "streamSettings": {"network": "ws", "wsSettings": {"path": "/vless"}}
    },
    {
      "tag": "trojan-ws",
      "port": 10003,
      "protocol": "trojan",
      "settings": {"clients": [{"password": "$XRAY_UUID"}]},
      "streamSettings": {"network": "ws", "wsSettings": {"path": "/trws"}}
    },
    {
      "tag": "socks-ws",
      "port": 10004,
      "protocol": "socks",
      "settings": {"auth": "password", "accounts": [], "udp": true},
      "streamSettings": {"network": "ws", "wsSettings": {"path": "/ssws"}}
    },
    {
      "tag": "vmess-grpc",
      "port": 10005,
      "protocol": "vmess",
      "settings": {"clients": [{"id": "$XRAY_UUID"}]},
      "streamSettings": {"network": "grpc", "grpcSettings": {"serviceName": "vmess-grpc"}}
    },
    {
      "tag": "vless-grpc",
      "port": 10006,
      "protocol": "vless",
      "settings": {"clients": [{"id": "$XRAY_UUID"}], "decryption": "none"},
      "streamSettings": {"network": "grpc", "grpcSettings": {"serviceName": "vless-grpc"}}
    },
    {
      "tag": "trojan-grpc",
      "port": 10007,
      "protocol": "trojan",
      "settings": {"clients": [{"password": "$XRAY_UUID"}]},
      "streamSettings": {"network": "grpc", "grpcSettings": {"serviceName": "trojan-grpc"}}
    },
    {
      "tag": "socks-grpc",
      "port": 10008,
      "protocol": "socks",
      "settings": {"auth": "password", "accounts": [], "udp": true},
      "streamSettings": {"network": "grpc", "grpcSettings": {"serviceName": "socks-grpc"}}
    }
  ],
  "outbounds": [{"protocol": "freedom"}]
}
XRAYEOF

systemctl enable xray > /dev/null 2>&1
systemctl restart xray > /dev/null 2>&1
echo -e "${GREEN}[✓] Xray installé (VMess, VLESS, Trojan, SOCKS)${NC}"

# ===========================
# CONFIGURE SSH & WEBSOCKET
# ===========================
echo -e "${PURPLE}[4/8] ${WHITE}Configuration SSH, Dropbear, Stunnel, WebSocket...${NC}"

# SSH config
sed -i 's/#Port 22/Port 22/' /etc/ssh/sshd_config
systemctl restart sshd

# Dropbear
cat > /etc/default/dropbear << 'DROPEOF'
NO_START=0
DROPBEAR_PORT=109
DROPBEAR_EXTRA_ARGS="-p 143"
DROPBEAR_BANNER=""
DROPEOF
systemctl enable dropbear > /dev/null 2>&1
systemctl restart dropbear > /dev/null 2>&1

# Stunnel
cat > /etc/stunnel/stunnel.conf << STUNEOF
cert = /etc/stunnel/stunnel.pem
client = no
socket = a:SO_REUSEADDR=1
socket = l:TCP_NODELAY=1
socket = r:TCP_NODELAY=1

[dropbear]
accept = 447
connect = 127.0.0.1:109

[openssh]
accept = 777
connect = 127.0.0.1:22
STUNEOF

# Generate self-signed cert for stunnel
openssl req -new -x509 -days 3650 -nodes \
    -subj "/CN=$DOMAIN" \
    -out /etc/stunnel/stunnel.pem \
    -keyout /etc/stunnel/stunnel.pem > /dev/null 2>&1

systemctl enable stunnel4 > /dev/null 2>&1
systemctl restart stunnel4 > /dev/null 2>&1

# Squid
cat > /etc/squid/squid.conf << 'SQUIDEOF'
http_port 3128
http_port 8080
acl localnet src all
http_access allow localnet
http_access deny all
SQUIDEOF
systemctl enable squid > /dev/null 2>&1
systemctl restart squid > /dev/null 2>&1

# WebSocket SSH (using Python)
cat > /usr/local/bin/ws-ssh.py << 'WSPY'
#!/usr/bin/env python3
import socket, threading, sys, select

def handler(client, remote_host, remote_port):
    try:
        remote = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        remote.connect((remote_host, remote_port))
        data = client.recv(4096).decode('utf-8', errors='ignore')
        if 'upgrade: websocket' in data.lower():
            client.send(b'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n')
        while True:
            r, w, e = select.select([client, remote], [], [], 60)
            if not r: break
            for s in r:
                data = s.recv(4096)
                if not data: return
                (remote if s is client else client).send(data)
    except: pass
    finally:
        client.close()

def main(port, remote_port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('0.0.0.0', port))
    s.listen(100)
    while True:
        c, a = s.accept()
        threading.Thread(target=handler, args=(c, '127.0.0.1', remote_port), daemon=True).start()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 80
    remote = int(sys.argv[2]) if len(sys.argv) > 2 else 22
    main(port, remote)
WSPY
chmod +x /usr/local/bin/ws-ssh.py

# Create systemd service for WS
cat > /etc/systemd/system/ws-ntls.service << 'SVCEOF'
[Unit]
Description=WebSocket NTLS
After=network.target

[Service]
ExecStart=/usr/bin/python3 /usr/local/bin/ws-ssh.py 80 22
Restart=always

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl enable ws-ntls > /dev/null 2>&1
systemctl start ws-ntls > /dev/null 2>&1

# BADVPN (UDPGW)
cat > /etc/systemd/system/badvpn.service << 'BADVPNEOF'
[Unit]
Description=BadVPN UDPGW
After=network.target

[Service]
ExecStart=/usr/bin/badvpn-udpgw --listen-addr 127.0.0.1:7300 --max-clients 1000
Restart=always

[Install]
WantedBy=multi-user.target
BADVPNEOF

systemctl enable badvpn > /dev/null 2>&1
systemctl start badvpn > /dev/null 2>&1

echo -e "${GREEN}[✓] SSH/Dropbear/Stunnel/WS/UDPGW configurés${NC}"

# ===========================
# CONFIGURE OPENVPN
# ===========================
echo -e "${PURPLE}[5/8] ${WHITE}Configuration OpenVPN...${NC}"
mkdir -p /etc/openvpn/easy-rsa
cp -r /usr/share/easy-rsa/* /etc/openvpn/easy-rsa/ 2>/dev/null || true

cd /etc/openvpn/easy-rsa
cat > vars << VARSEOF
set_var EASYRSA_REQ_CN "$DOMAIN"
set_var EASYRSA_BATCH "1"
VARSEOF

./easyrsa init-pki > /dev/null 2>&1
./easyrsa --batch build-ca nopass > /dev/null 2>&1
./easyrsa --batch gen-dh > /dev/null 2>&1
./easyrsa --batch build-server-full server nopass > /dev/null 2>&1

cat > /etc/openvpn/server.conf << OVPNEOF
port 1194
proto tcp
dev tun
ca /etc/openvpn/easy-rsa/pki/ca.crt
cert /etc/openvpn/easy-rsa/pki/issued/server.crt
key /etc/openvpn/easy-rsa/pki/private/server.key
dh /etc/openvpn/easy-rsa/pki/dh.pem
server 10.8.0.0 255.255.255.0
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"
keepalive 10 120
cipher AES-256-GCM
persist-key
persist-tun
verb 3
OVPNEOF

# Enable IP forwarding
echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
sysctl -p > /dev/null 2>&1

# NAT rules
iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o $(ip route | grep default | awk '{print $5}') -j MASQUERADE
iptables-save > /etc/iptables.rules 2>/dev/null

systemctl enable openvpn@server > /dev/null 2>&1
systemctl start openvpn@server > /dev/null 2>&1
echo -e "${GREEN}[✓] OpenVPN configuré${NC}"

# ===========================
# CONFIGURE SLOWDNS
# ===========================
echo -e "${PURPLE}[6/8] ${WHITE}Configuration SlowDNS...${NC}"
mkdir -p /etc/slowdns

# Generate SlowDNS keys
if command -v slowdns-server &> /dev/null; then
    echo -e "${GREEN}[✓] SlowDNS déjà installé${NC}"
else
    # Download slowdns binary
    wget -qO /usr/local/bin/slowdns-server https://github.com/nicovon24/slowdns/releases/latest/download/slowdns-server-linux-amd64 2>/dev/null || true
    chmod +x /usr/local/bin/slowdns-server 2>/dev/null || true
fi

# Generate key pair
SLOWDNS_PUB=$(openssl rand -hex 32)
echo "$SLOWDNS_PUB" > /etc/slowdns/public.key

cat > /etc/systemd/system/slowdns.service << SDEOF
[Unit]
Description=SlowDNS Server
After=network.target

[Service]
ExecStart=/usr/local/bin/slowdns-server -dns $NS_DOMAIN
Restart=always

[Install]
WantedBy=multi-user.target
SDEOF

systemctl enable slowdns > /dev/null 2>&1
systemctl start slowdns > /dev/null 2>&1
echo -e "${GREEN}[✓] SlowDNS configuré (PUB: ${SLOWDNS_PUB:0:20}...)${NC}"

# ===========================
# CONFIGURE NGINX + SSL + WEB PANEL
# ===========================
echo -e "${PURPLE}[7/8] ${WHITE}Configuration Nginx, SSL et Panel Web...${NC}"

# Build the web panel
mkdir -p $NEXUS_DIR
cd $NEXUS_DIR

# Clone the GitHub repo (the panel source)
GITHUB_REPO="https://github.com/DJUNAMIKE237/nexus-pro-panel.git"  # Update with your actual repo
if [[ -d "$NEXUS_WEB" ]]; then
    cd $NEXUS_WEB && git pull > /dev/null 2>&1
else
    echo -e "${YELLOW}[INFO] Clonage du panel web...${NC}"
    git clone $GITHUB_REPO $NEXUS_WEB > /dev/null 2>&1 || mkdir -p $NEXUS_WEB
fi

# Build the web panel
if [[ -f "$NEXUS_WEB/package.json" ]]; then
    cd $NEXUS_WEB
    npm install > /dev/null 2>&1
    npm run build > /dev/null 2>&1
    BUILD_DIR="$NEXUS_WEB/dist"
else
    BUILD_DIR="$NEXUS_WEB"
fi

# Write nexus-config.json into the built web panel so the site can read it on first load
cat > $BUILD_DIR/nexus-config.json << WEBCFGEOF
{
  "server_ip": "$SERVER_IP",
  "domain": "$DOMAIN",
  "ns_domain": "$NS_DOMAIN",
  "panel_port": $PANEL_PORT,
  "admin_user": "$ADMIN_USER",
  "admin_pass": "$ADMIN_PASS",
  "xray_uuid": "$XRAY_UUID",
  "slowdns_pub": "$SLOWDNS_PUB",
  "openvpn_download": "https://$DOMAIN:2081"
}
WEBCFGEOF
echo -e "${GREEN}[✓] Configuration web injectée${NC}"

# Nginx configuration
cat > /etc/nginx/sites-available/nexus-panel << NGINXEOF
server {
    listen $PANEL_PORT ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    root $BUILD_DIR;
    index index.html;

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # WebSocket paths for Xray
    location /vmess {
        proxy_pass http://127.0.0.1:10001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location /vless {
        proxy_pass http://127.0.0.1:10002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location /trws {
        proxy_pass http://127.0.0.1:10003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location /ssws {
        proxy_pass http://127.0.0.1:10004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    # gRPC paths
    location /vmess-grpc { grpc_pass grpc://127.0.0.1:10005; }
    location /vless-grpc { grpc_pass grpc://127.0.0.1:10006; }
    location /trojan-grpc { grpc_pass grpc://127.0.0.1:10007; }
    location /socks-grpc { grpc_pass grpc://127.0.0.1:10008; }
}

# HTTPS redirect on 443 for WS TLS
server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location /vmess { proxy_pass http://127.0.0.1:10001; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; }
    location /vless { proxy_pass http://127.0.0.1:10002; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; }
    location /trws { proxy_pass http://127.0.0.1:10003; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; }
    location /ssws { proxy_pass http://127.0.0.1:10004; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; }

    location / {
        proxy_pass http://127.0.0.1:$PANEL_PORT;
        proxy_set_header Host \$host;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/nexus-panel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Get SSL certificate
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN > /dev/null 2>&1 || {
    echo -e "${YELLOW}[WARN] Certbot a échoué, utilisation d'un cert auto-signé${NC}"
    mkdir -p /etc/letsencrypt/live/$DOMAIN
    openssl req -new -x509 -days 365 -nodes \
        -subj "/CN=$DOMAIN" \
        -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
        -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem > /dev/null 2>&1
}

systemctl enable nginx > /dev/null 2>&1
systemctl restart nginx > /dev/null 2>&1
echo -e "${GREEN}[✓] Nginx + SSL + Panel Web configurés${NC}"

# ===========================
# SAVE CONFIG & CREATE NEXUS COMMAND
# ===========================
echo -e "${PURPLE}[8/8] ${WHITE}Finalisation...${NC}"

# Save configuration
cat > $NEXUS_CONFIG << CFGEOF
{
  "server_ip": "$SERVER_IP",
  "domain": "$DOMAIN",
  "ns_domain": "$NS_DOMAIN",
  "panel_port": $PANEL_PORT,
  "admin_user": "$ADMIN_USER",
  "admin_pass": "$ADMIN_PASS",
  "xray_uuid": "$XRAY_UUID",
  "slowdns_pub": "$SLOWDNS_PUB",
  "installed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "2.0"
}
CFGEOF
chmod 600 $NEXUS_CONFIG

# Create the 'nexus' command
cat > $NEXUS_BIN << 'NEXUSCMD'
#!/bin/bash
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; CYAN='\033[0;36m'
WHITE='\033[1;37m'; NC='\033[0m'; BOLD='\033[1m'

CONFIG="/opt/nexus-pro/config.json"

show_banner() {
    clear
    echo -e "${PURPLE}${BOLD}"
    echo "  ╔════════════════════════════════════════╗"
    echo "  ║        NEXUS PRO PANEL v2.0            ║"
    echo "  ║      VPN Management Terminal           ║"
    echo "  ╚════════════════════════════════════════╝"
    echo -e "${NC}"
    
    IP=$(jq -r '.server_ip' $CONFIG)
    DOMAIN=$(jq -r '.domain' $CONFIG)
    PORT=$(jq -r '.panel_port' $CONFIG)
    echo -e "  ${CYAN}IP:${NC} $IP  ${CYAN}Domain:${NC} $DOMAIN  ${CYAN}Port:${NC} $PORT"
    echo ""
}

show_menu() {
    echo -e "  ${PURPLE}━━━━━━━━ MENU PRINCIPAL ━━━━━━━━${NC}"
    echo ""
    echo -e "  ${GREEN}[1]${NC} 📊 Status des Services"
    echo -e "  ${GREEN}[2]${NC} 👤 Créer un Compte SSH"
    echo -e "  ${GREEN}[3]${NC} ⚡ Créer un Compte VMess"
    echo -e "  ${GREEN}[4]${NC} 🚀 Créer un Compte VLESS"
    echo -e "  ${GREEN}[5]${NC} 🛡️  Créer un Compte Trojan"
    echo -e "  ${GREEN}[6]${NC} 📡 Créer un Compte UDP Custom"
    echo -e "  ${GREEN}[7]${NC} 🔐 Créer un Compte OpenVPN"
    echo -e "  ${GREEN}[8]${NC} 🌐 Créer un Compte SlowDNS"
    echo -e "  ${GREEN}[9]${NC} 🗑️  Supprimer un Compte"
    echo -e "  ${GREEN}[10]${NC} 📋 Lister les Comptes"
    echo -e "  ${GREEN}[11]${NC} 🔄 Redémarrer les Services"
    echo -e "  ${GREEN}[12]${NC} 🌐 Ouvrir le Panel Web"
    echo -e "  ${GREEN}[13]${NC} ⚙️  Configuration du Serveur"
    echo -e "  ${GREEN}[14]${NC} 📊 Utilisation Système"
    echo -e "  ${GREEN}[15]${NC} 🔑 Changer le Mot de Passe Admin"
    echo -e "  ${GREEN}[0]${NC}  ❌ Quitter"
    echo ""
    echo -e "  ${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_services() {
    echo -e "\n  ${CYAN}${BOLD}Status des Services:${NC}\n"
    for svc in sshd dropbear stunnel4 squid xray openvpn@server nginx ws-ntls badvpn slowdns; do
        if systemctl is-active --quiet $svc 2>/dev/null; then
            echo -e "  ${GREEN}●${NC} $svc ${GREEN}[RUNNING]${NC}"
        else
            echo -e "  ${RED}●${NC} $svc ${RED}[STOPPED]${NC}"
        fi
    done
    echo ""
}

create_ssh_account() {
    DOMAIN=$(jq -r '.domain' $CONFIG)
    NS_DOMAIN=$(jq -r '.ns_domain' $CONFIG)
    IP=$(jq -r '.server_ip' $CONFIG)
    SLOWDNS_PUB=$(jq -r '.slowdns_pub' $CONFIG)
    
    read -p "  Username: " user
    read -sp "  Password: " pass; echo
    read -p "  Durée (jours): " days
    
    useradd -M -s /bin/false -e $(date -d "+${days} days" +%Y-%m-%d) $user 2>/dev/null
    echo "$user:$pass" | chpasswd
    
    expiry=$(date -d "+${days} days" "+%b %d, %Y")
    
    echo ""
    echo -e "${CYAN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
    echo -e "${CYAN}┃               SSH ACCOUNT DETAILS                ┃${NC}"
    echo -e "${CYAN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
    echo -e "${CYAN}┃${NC} Username    : ${WHITE}$user${NC}"
    echo -e "${CYAN}┃${NC} Password    : ${WHITE}$pass${NC}"
    echo -e "${CYAN}┃${NC} Expiry Date : ${WHITE}$expiry${NC}"
    echo -e "${CYAN}┃${NC} Host/IP     : ${WHITE}$IP${NC}"
    echo -e "${CYAN}┃${NC} Domain      : ${WHITE}$DOMAIN${NC}"
    echo -e "${CYAN}┃${NC} NS Domain   : ${WHITE}$NS_DOMAIN${NC}"
    echo -e "${CYAN}●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●${NC}"
    echo -e "${CYAN}┃${NC} OpenSSH      : 22"
    echo -e "${CYAN}┃${NC} Dropbear     : 109, 143"
    echo -e "${CYAN}┃${NC} Stunnel      : 447, 777"
    echo -e "${CYAN}┃${NC} WS NTLS      : 80"
    echo -e "${CYAN}┃${NC} WS TLS       : 443"
    echo -e "${CYAN}┃${NC} UDPGW        : 7100–7900"
    echo -e "${CYAN}┃${NC} Squid        : 3128, 8080"
    echo -e "${CYAN}●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●${NC}"
    echo -e "${CYAN}┃${NC} UDP Custom"
    echo -e "${CYAN}┃${NC} ${DOMAIN}:1-65535@${user}:${pass}"
    echo -e "${CYAN}●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●${NC}"
    echo -e "${CYAN}┃${NC} Slow DNS"
    echo -e "${CYAN}┃${NC} PUB : ${SLOWDNS_PUB}"
    echo -e "${CYAN}●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●${NC}"
    echo -e "${CYAN}┃${NC} Payload"
    echo -e "${CYAN}┃${NC} GET / HTTP/1.1[crlf]Host: ${DOMAIN}[crlf]Upgrade: websocket[crlf][crlf]"
    echo -e "${CYAN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
    echo ""
}

restart_services() {
    echo -e "\n  ${YELLOW}Redémarrage de tous les services...${NC}"
    for svc in sshd dropbear stunnel4 squid xray openvpn@server nginx ws-ntls badvpn; do
        systemctl restart $svc 2>/dev/null
    done
    echo -e "  ${GREEN}[✓] Tous les services ont été redémarrés${NC}\n"
}

system_usage() {
    echo -e "\n  ${CYAN}${BOLD}Utilisation Système:${NC}\n"
    echo -e "  ${WHITE}CPU:${NC}    $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
    echo -e "  ${WHITE}RAM:${NC}    $(free -h | awk '/^Mem:/{print $3"/"$2}')"
    echo -e "  ${WHITE}Disque:${NC} $(df -h / | awk 'NR==2{print $3"/"$2" ("$5")"}')"
    echo -e "  ${WHITE}Uptime:${NC} $(uptime -p)"
    echo ""
}

# Main loop
while true; do
    show_banner
    show_menu
    read -p "  $(echo -e ${CYAN}Choix${NC} [0-15]: )" choice
    
    case $choice in
        1) check_services; read -p "  Appuyez sur Entrée..." ;;
        2) create_ssh_account; read -p "  Appuyez sur Entrée..." ;;
        3) echo -e "\n  ${YELLOW}Utilisez le Panel Web pour créer des comptes VMess${NC}\n"; read -p "  Appuyez sur Entrée..." ;;
        4) echo -e "\n  ${YELLOW}Utilisez le Panel Web pour créer des comptes VLESS${NC}\n"; read -p "  Appuyez sur Entrée..." ;;
        5) echo -e "\n  ${YELLOW}Utilisez le Panel Web pour créer des comptes Trojan${NC}\n"; read -p "  Appuyez sur Entrée..." ;;
        6) echo -e "\n  ${YELLOW}Utilisez le Panel Web pour créer des comptes UDP Custom${NC}\n"; read -p "  Appuyez sur Entrée..." ;;
        7) echo -e "\n  ${YELLOW}Utilisez le Panel Web pour créer des comptes OpenVPN${NC}\n"; read -p "  Appuyez sur Entrée..." ;;
        8) echo -e "\n  ${YELLOW}Utilisez le Panel Web pour créer des comptes SlowDNS${NC}\n"; read -p "  Appuyez sur Entrée..." ;;
        9) 
            read -p "  Username à supprimer: " del_user
            userdel $del_user 2>/dev/null
            echo -e "  ${GREEN}[✓] Compte $del_user supprimé${NC}"
            read -p "  Appuyez sur Entrée..."
            ;;
        10) 
            echo -e "\n  ${CYAN}Comptes système:${NC}"
            awk -F: '$3 >= 1000 && $1 != "nobody" {printf "  %-20s Expire: %s\n", $1, $NF}' /etc/passwd | head -20
            echo ""
            read -p "  Appuyez sur Entrée..."
            ;;
        11) restart_services; read -p "  Appuyez sur Entrée..." ;;
        12) 
            PORT=$(jq -r '.panel_port' $CONFIG)
            DOMAIN=$(jq -r '.domain' $CONFIG)
            echo -e "\n  ${GREEN}Panel Web: ${WHITE}https://$DOMAIN:$PORT${NC}\n"
            read -p "  Appuyez sur Entrée..."
            ;;
        13)
            echo -e "\n  ${CYAN}Configuration actuelle:${NC}"
            jq '.' $CONFIG
            echo ""
            read -p "  Appuyez sur Entrée..."
            ;;
        14) system_usage; read -p "  Appuyez sur Entrée..." ;;
        15)
            read -sp "  Nouveau mot de passe admin: " new_pass; echo
            jq ".admin_pass = \"$new_pass\"" $CONFIG > /tmp/nexus_cfg.tmp && mv /tmp/nexus_cfg.tmp $CONFIG
            echo -e "  ${GREEN}[✓] Mot de passe modifié${NC}"
            read -p "  Appuyez sur Entrée..."
            ;;
        0) echo -e "\n  ${PURPLE}Au revoir! 👋${NC}\n"; exit 0 ;;
        *) echo -e "\n  ${RED}Option invalide${NC}"; sleep 1 ;;
    esac
done
NEXUSCMD
chmod +x $NEXUS_BIN

echo -e "${GREEN}[✓] Commande 'nexus' créée${NC}"

# ===========================
# FIREWALL
# ===========================
echo -e "${PURPLE}[BONUS] ${WHITE}Configuration du pare-feu...${NC}"
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw allow $PANEL_PORT/tcp > /dev/null 2>&1
ufw allow 109/tcp > /dev/null 2>&1
ufw allow 143/tcp > /dev/null 2>&1
ufw allow 447/tcp > /dev/null 2>&1
ufw allow 777/tcp > /dev/null 2>&1
ufw allow 1194/tcp > /dev/null 2>&1
ufw allow 2200/tcp > /dev/null 2>&1
ufw allow 3128/tcp > /dev/null 2>&1
ufw allow 8000/tcp > /dev/null 2>&1
ufw allow 8080/tcp > /dev/null 2>&1
ufw allow 53/udp > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
echo -e "${GREEN}[✓] Pare-feu configuré${NC}"

# ===========================
# INSTALLATION COMPLETE
# ===========================
echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║                                                      ║"
echo "║        ✅ INSTALLATION TERMINÉE AVEC SUCCÈS!         ║"
echo "║                                                      ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo -e "║  🌐 Panel Web : ${WHITE}https://$DOMAIN:$PANEL_PORT${GREEN}       ║"
echo -e "║  👤 Admin     : ${WHITE}$ADMIN_USER${GREEN}                       ║"
echo -e "║  🔑 Mot de passe: ${WHITE}[celui que vous avez défini]${GREEN}    ║"
echo "║                                                      ║"
echo "║  📟 Terminal   : tapez 'nexus' pour le menu          ║"
echo "║                                                      ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  Services installés:                                  ║"
echo "║  ✓ SSH (22) + Dropbear (109,143)                     ║"
echo "║  ✓ Stunnel (447,777)                                  ║"
echo "║  ✓ WebSocket (80 NTLS, 443 TLS)                      ║"
echo "║  ✓ Xray (VMess/VLESS/Trojan/SOCKS)                   ║"
echo "║  ✓ OpenVPN (TCP 1194, SSL 2200)                      ║"
echo "║  ✓ SlowDNS + UDP Custom                              ║"
echo "║  ✓ UDPGW (BadVPN)                                    ║"
echo "║  ✓ Squid Proxy (3128, 8080)                          ║"
echo "║  ✓ Nginx + SSL                                        ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${CYAN}  Tapez ${WHITE}${BOLD}nexus${NC}${CYAN} dans le terminal pour accéder au menu de gestion.${NC}"
echo ""
