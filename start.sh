
#api
pm2 delete warehouse
pm2 start api/warehouse.js --watch --ignore-watch="*.log test *.sh ui bin example .git"

pm2 delete warehouse-rule
pm2 start bin/rule_handler.js --name warehouse-rule --watch --ignore-watch="*.log test *.sh ui example .git"

pm2 delete warehouse-event
pm2 start bin/event_handler.js --name warehouse-event --watch --ignore-watch="*.log test *.sh ui example .git"

pm2 delete warehouse-appinfo
pm2 start bin/appinfo.js --name warehouse-appinfo --watch --ignore-watch="*.log test *.sh ui example .git"

pm2 save
