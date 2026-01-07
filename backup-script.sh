#!/bin/sh

# Install tools
apk add --no-cache bash coreutils findutils busybox-extras

# Write actual backup script to a file
cat << 'EOF' > /run-backup.sh
#!/bin/sh
DATE=$(date +%Y-%m-%d)

# MySQL daily
mkdir -p /backup/mysql/$DATE
cp -r /var/lib/mysql/* /backup/mysql/$DATE/
find /backup/mysql/ -type d -mtime +30 -exec rm -rf {} +

# Uploads every 3 days
DAY=$(date +%d)
if [ $((10#$DAY % 3)) -eq 0 ]; then
  mkdir -p /backup/uploads/$DATE
  cp -r /app/uploads/* /backup/uploads/$DATE/
  find /backup/uploads/ -type d -mtime +15 -exec rm -rf {} +
fi

echo "✅ Backup done for $DATE"
EOF

chmod +x /run-backup.sh

# Run daily at 00:00
echo "0 0 * * * /run-backup.sh >> /var/log/backup.log 2>&1" | crontab -

# Start cron
crond -f -L /dev/stdout
