#!/bin/bash
#? |-----------------------------------------------------------------------------------------------|
#? |  /build/deploy.sh                                                                             |
#? |                                                                                               |
#? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
#? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
#? |-----------------------------------------------------------------------------------------------|
set -e
pushd .. > /dev/null

mkdir ~/tmp
pushd ~/tmp > /dev/null
tmpdir="$(pwd)"
popd > /dev/null

echo -e "\033[1;30m + CURRENT DIR: $(pwd)"
echo -e "\033[1;30m + TEMPORARY DIR: $tmpdir"
echo ""

echo -e "\033[1;35mDEPLOYING \033[30m(Build $TRAVIS_BUILD_NUMBER)\033[m"
start=$(date +%s.%N)

echo -e " \033[1;37m* \033[1;34mCOPYING FILES TO TEMPORARY DIR\033[1;30m"
cp -rf . $tmpdir/
rm -rf $tmpdir/.git
cd ..
rm -rf dealHunterSuiteBackend

echo -e " \033[1;37m* \033[1;34mGIT INITIALIZING"

git config --global user.email "belivipro9x99@gmail.com"
git config --global user.name "Belikhun"
git clone https://belivipro9x99:${GH_TOKEN}@github.com/belivipro9x99/dealHunterSuiteBackend.git
cd dealHunterSuiteBackend
git checkout production

echo -e " \033[1;37m* \033[1;34mCOPYING FILES FROM TEMPORARY DIR"
cp -rf $tmpdir/. .

echo -e " \033[1;37m* \033[1;34mCREATING COMMIT"
git add .
git commit --message "🛠 BUILD: $TRAVIS_BUILD_NUMBER"
git push -f -u origin production
	
end=$(date +%s.%N)
echo -e " \033[1;37m→ \033[1;33m$(php -r "echo $end - $start;")s"
echo -e "\033[1;32m✓\033[0m Done!"

popd > /dev/null
exit 0