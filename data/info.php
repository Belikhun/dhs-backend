<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /data/info.php                                                                               |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

	define("APPNAME", "Deal Hunter Suite");
	define("AUTHOR", "Team DHS");
	define("VERSION", "0.7.0");
	define("VERSION_TAG", "release");
	define("REPO_ADDRESS", "");
	define("REPORT_ERROR", REPO_ADDRESS . "/issues");
	define("CONTACT_LINK", "http://m.me/HunterDealJustFun");
	define("TRACK_ID", "UA-124598427-2");

	// Size Limit
	define("MAX_IMAGE_SIZE", 2097153);
	
	define("IMAGE_ALLOW", Array("jpg", "png", "gif", "webp"));
	// Path
	define("AVATAR_DIR", $_SERVER["DOCUMENT_ROOT"] ."/data/avatar");
	define("SCRIPTS_DIR", $_SERVER["DOCUMENT_ROOT"] ."/data/scripts");

	define("HOST_NAME", "dealhunter.000webhostapp.com");

	define("EXTENSION_ID", "ooeeakiohlmkbdmdpfkhkkafgappoijd");
	define("EXTENSION_VERSION", "3.0");
	define("EXTENSION_ZIP_PATH", $_SERVER["DOCUMENT_ROOT"] ."/data/extension.zip");
	define("EXTENSION_CRX_PATH", $_SERVER["DOCUMENT_ROOT"] ."/data/extension.crx");

	ob_start(); ?>
		OK SYSTEM COOL
	<?php
	$ANNOUNCEMENT = ob_get_clean();

	define("EXTENSION_ANNOUNCEMENT", Array(
		"enabled" => true,
		"level" => "okay",
		"message" => $ANNOUNCEMENT
	));