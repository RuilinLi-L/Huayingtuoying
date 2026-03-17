@echo off
cd /d D:\code\Projects\Huayingtuoying
start "" /b "C:\Program Files\nodejs\npm.cmd" run serve:dist 1>"D:\code\Projects\Huayingtuoying\.runtime\serve-dist.out.log" 2>"D:\code\Projects\Huayingtuoying\.runtime\serve-dist.err.log"
