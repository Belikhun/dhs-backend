#!/bin/bash
#? |-----------------------------------------------------------------------------------------------|
#? |  /build/build.sh                                                                              |
#? |                                                                                               |
#? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
#? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
#? |-----------------------------------------------------------------------------------------------|
set -e

if hash javascript-obfuscator 2>/dev/null; then
	echo -e "\033[1;32m✓\033[0m Javascript Obfuscator is installed!"
else
	echo -e "\033[1;31m✗\033[0m Javascript Obfuscator is not installed!"
	exit 1
fi

echo ""
echo -e "\033[1;34mCopying dbinfo.php"
cp -f production/dbinfo.php ../data/dbinfo.php



echo -e "\033[1;32m✓\033[0m Done!"
exit 0