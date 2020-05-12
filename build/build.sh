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

echo -e "\033[1;35mCopying .gitignore"
cp -f production/.gitignore ../.gitignore

echo -e "\033[1;35mCopying .htaccess"
cp -f production/.htaccess ../.htaccess


echo -e "\033[1;36mObfuscating Scripts"
pushd ../data/scripts > /dev/null

for dir in */ ; do
	start=$(date +%s.%N)
    echo -e " \033[1;37m● \033[1;33m${dir: : -1}\033[1;31m"
	javascript-obfuscator "${dir: : -1}/script.js" --compact true --string-array true --self-defending true --unicode-escape-sequence true -o "${dir: : -1}/script.min.js" > /dev/null && echo -e "   \033[1;32m✓\033[0m DONE!" || echo -e "   \033[1;31m✗\033[0m ERRORED!"
	end=$(date +%s.%N)

	echo -e "   \033[1;37m→ \033[1;30m$(node -pe "$end - $start")s"
done

popd > /dev/null

echo -e "\033[1;32m✓\033[0m Done!"
exit 0