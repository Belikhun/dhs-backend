<?php
	//? |-----------------------------------------------------------------------------------------------|
	//? |  /api/scripts/icon.php                                                                        |
	//? |                                                                                               |
	//? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
	//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
	//? |-----------------------------------------------------------------------------------------------|

	// SET PAGE TYPE
	define("PAGE_TYPE", "NORMAL");
	
	require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ratelimit.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/belibrary.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/logs.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ezsql.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/tools/svgIcon.php";

	$id = reqQuery("id");

	if (!isset($_SESSION["authKey"])) {
		svgIcon($id, 200, false);
		stop(-1, "Đã có lỗi không mong muốn xảy ra!", 500);
	}

	$key = $_SESSION["authKey"];
	$keyDB = new ezsql(DB_TABLE);
	
	$query = "SELECT `licenses` FROM `keylist` WHERE `key` = ?";
	$result = $keyDB -> query($query, $key);

	if (empty($result)) {
		svgIcon($id, 200, false);
		stop(-1, "Key không tồn tại trong máy chủ!", 403, Array( "key" => $key ));
	}

	$licensesList = unserialize($result[0]["licenses"]);
	$curTime = time();
	$allowAccess = false;

	foreach ($licensesList as $license) {
		$allow = explode(";", $license["allow"]);
	
		if (($license["allow"] === "*" || in_array($id, $allow)) && (($license["expire"] - $curTime) > 0)) {
			$allowAccess = true;
			break;
		}
	}

	if (!$allowAccess) {
		svgIcon($id, 200, false);
		stop(31, "Bạn không có quyền xem Script ID: ". $id, 403, Array( "id" => $id ));
	}

	$files = glob(SCRIPTS_DIR ."/". $id .".{". join(",", IMAGE_ALLOW) ."}", GLOB_BRACE);
	
	if (count($files) > 0) {
		contentType(pathinfo($files[0], PATHINFO_EXTENSION))
			?: contentType("png");
			
		header("Content-length: ". filesize($files[0]));
		readfile($files[0]);
		
		stop(0, "Success", 200);
	} else
		svgIcon($id);