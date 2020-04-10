#!/bin/bash
#? |-----------------------------------------------------------------------------------------------|
#? |  /build/deploy.sh                                                                             |
#? |                                                                                               |
#? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
#? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
#? |-----------------------------------------------------------------------------------------------|
set -e

echo -e "\033[1;35mDEPLOYING\033[m"
start=$(date +%s.%N)

git config --global user.email "belivipro9x99@gmail.com"
git config --global user.name "Belikhun"
git checkout -b production
git add .
git commit --message "Travis build: $TRAVIS_BUILD_NUMBER"
git remote add origin https://${GH_TOKEN}@github.com/dealHunterSuiteBackend.git > /dev/null 2>&1
git push --quiet --set-upstream origin production
	
end=$(date +%s.%N)
echo -e " \033[1;37m→ \033[1;33m$(echo "$end - $start" | bc)s"
echo -e "\033[1;32m✓\033[0m Done!"
exit 0