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

echo -e "\033[1;34mCopying dbinfo.php"
cp -f production/dbinfo.php ../data/dbinfo.php

echo -e "\033[37mObfuscating Scripts"
pushd ../data/scripts > /dev/null

for dir in */ ; do
	res1=$(date +%s.%N)
    echo -e " \033[1;37m● \033[m$dir"
	javascript-obfuscator "$(dir)script.js" --compact true --string-array true --self-defending true --unicode-escape-sequence true -o "$(dir)script.min.js"
	res2=$(date +%s.%N)

	echo -e "   \033[1;37m→ \033[1;33m$((res2 - res1))s"
done

popd > /dev/null

echo -e "\033[1;32m✓\033[0m Done!"
exit 0