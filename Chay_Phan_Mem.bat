@echo off
chcp 65001 > nul
title Phần mềm hỗ trợ quản lý công việc - Ngành GDMN
echo ======================================================================
echo    PHẦN MỀM HỖ TRỢ QUẢN LÝ CÔNG VIỆC - NGÀNH GIÁO DỤC MẦM NON (GDMN)
echo    Giám đốc CTĐT: TS. Đặng Út Phượng
echo ======================================================================
echo.
echo Đang khởi động hệ thống máy chủ và ứng dụng...
echo.
start "" "http://localhost:5000"
node server/index.js
pause
