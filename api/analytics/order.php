<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/analytics/order.php                                                                     |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ezsql.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

	define("ORDERLOG_ROOT", $_SERVER["DOCUMENT_ROOT"] ."/data/order");
	define("ORDERLOG_FILE", "log.json");
	
	// SET PAGE TYPE
	define("PAGE_TYPE", "API");

	if (!file_exists(ORDERLOG_ROOT))
		mkdir(ORDERLOG_ROOT);

	if (getForm("action") === "getData") {
		if (!isLoggedIn())
			stop(11, "Bạn chưa đăng nhập!", 401);

		if ($_SESSION["id"] !== "admin")
			stop(31, "Access Denied!", 403);

		checkToken();

		$orderLogs = Array();
		$orderDirs = glob(ORDERLOG_ROOT ."/*", GLOB_ONLYDIR);
		
		foreach ($orderDirs as $dir)
			$orderLogs = array_merge($orderLogs, json_decode((new fip($dir ."/". ORDERLOG_FILE, "[]")) -> read(), true));

		stop(0, "Success", 200, array_reverse($orderLogs), true);
	}

    if (!isset($_SESSION["authKey"]))
        stop(-1, "Đã có lỗi không mong muốn xảy ra!", 500);

    $key = $_SESSION["authKey"];
    $keyDB = new ezsql(DB_TABLE);
    
    $query = "SELECT `name` FROM `keylist` WHERE `key` = ?";
    $result = $keyDB -> query($query, $key);

    if (empty($result))
		stop(-1, "Key không tồn tại trong máy chủ!", 403, Array( "key" => $key ));
	
	checkToken();

	$note = getForm("note");
	$data = Array(
		"name"		=>	$result[0]["name"],
		"script"	=>	reqForm("script"),
		"itemName"	=>	reqForm("name"),
		"link"		=>	reqForm("link"),
		"price"		=>	reqType(reqForm("price"), "integer"),
		"count"		=>	reqType(reqForm("count"), "integer"),
		"runPrice"	=>	withType(getForm("runPrice"), "integer", null),
		"oldPrice"	=>	withType(getForm("oldPrice"), "integer", null),
		"thumbnail"	=>	getForm("thumbnail"),
		"note"		=>	$note ? explode("\n", $note) : null,
		"time"		=>	time()
	);

	$datestamp = strtotime(date("Y-m-d"));

	if (!file_exists(ORDERLOG_ROOT ."/$datestamp"))
		mkdir(ORDERLOG_ROOT ."/$datestamp");

	$orderLogs = new fip(ORDERLOG_ROOT ."/$datestamp/". ORDERLOG_FILE, "[]");
	$logs = json_decode($orderLogs -> read(), true);
	array_push($logs, $data);
	$orderLogs -> write(json_encode($logs, JSON_PRETTY_PRINT));

	stop(0, "Success!", 200, $data);