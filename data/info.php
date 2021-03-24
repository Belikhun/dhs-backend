<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /data/info.php                                                                               |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

	// dont claim it for your own. its not nice
	define("APPNAME", "Deal Hunter Suite");
	define("AUTHOR", "Team DHS");
	define("VERSION", "0.9.3");
	define("VERSION_TAG", "release");
	define("REPO_ADDRESS", "https://github.com/belivipro9x99/dealHunterSuiteBackend");
	define("REPORT_ERROR", REPO_ADDRESS . "/issues");
	define("CONTACT_LINK", "http://m.me/HunterDealJustFun");
	define("TRACK_ID", "UA-124598427-2");

	// Size Limit
	define("MAX_UPLOAD_SIZE", 10*1024*1024);
	define("MAX_IMAGE_SIZE", 2097153);
	define("MAX_ATTACHMENT_SIZE", 268435456);
	
	define("UPLOAD_ALLOW", Array("pas", "cpp", "c", "pp", "exe", "class", "py", "java"));
	define("IMAGE_ALLOW", Array("jpg", "png", "gif", "webp"));

	// Path
	define("AVATAR_DIR", $_SERVER["DOCUMENT_ROOT"] ."/data/avatar");
	define("SCRIPTS_DIR", $_SERVER["DOCUMENT_ROOT"] ."/data/scripts");

	define("HOST_NAME", "dealhuntersuite.com");

	define("EXTENSION_ID", "ooeeakiohlmkbdmdpfkhkkafgappoijd");
	define("EXTENSION_VERSION", "7.6");
	define("EXTENSION_ZIP_PATH", $_SERVER["DOCUMENT_ROOT"] ."/data/extension.zip");
	define("EXTENSION_CRX_PATH", $_SERVER["DOCUMENT_ROOT"] ."/data/extension.crx");

	// CACHE
	define("CACHE_LOCATION", $_SERVER["DOCUMENT_ROOT"] ."/.cache");
	define("CACHE_DEFAULT_AGE", 10);