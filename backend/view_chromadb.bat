@echo off
title ChromaDB Viewer - AI Resume Analyzer
color 0D

echo.
echo  ==========================================
echo   ChromaDB Vector Database Viewer
echo  ==========================================
echo.
echo  Generating ChromaDB dashboard...
echo.

cd /d "%~dp0"

:: Generate the HTML viewer from ChromaDB
python view_chromadb.py

echo.
echo  Opening in browser...
start chromadb_viewer.html

echo.
echo  Done! If ChromaDB is offline, the viewer
echo  will show an empty state. Make sure the
echo  backend is running first.
echo.
pause
