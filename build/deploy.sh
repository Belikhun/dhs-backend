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

echo -e "\033[1;35mDEPLOYING \033[30m(Build $CIRCLE_BUILD_NUM)\033[m"
start=$(date +%s.%N)

echo -e " \033[1;37m* \033[1;34mCOPYING FILES TO TEMPORARY DIR"
cp -rf . $tmpdir/
rm -rf $tmpdir/.git
cd ..
rm -rf dealHunterSuiteBackend

echo -e " \033[1;37m* \033[1;34mGIT INITIALIZING"

git config --global user.email "Belikhun@gmail.com"
git config --global user.name "Belikhun"
git clone https://Belikhun:${GH_TOKEN}@github.com/Belikhun/dealHunterSuiteBackend.git
cd dealHunterSuiteBackend
git checkout -b production
git reset --hard origin/production
git rm -rf . > /dev/null

echo -e " \033[1;37m* \033[1;34mCOPYING FILES FROM TEMPORARY DIR"
cp -rf $tmpdir/. .

echo -e " \033[1;37m* \033[1;34mCREATING COMMIT"
git add .
git commit -m "🛠 CI BUILD: $CIRCLE_BUILD_NUM" -m "Commit $CIRCLE_SHA1 by $CIRCLE_USERNAME" -m "Message: $COMMIT_MESSAGE"
git push -f -u origin production

end=$(date +%s.%N)
echo -e " \033[1;37m→ \033[1;33m$(php -r "echo $end - $start;")s"
echo -e "\033[1;32m✓\033[0m Done!"

popd > /dev/null
exit 0