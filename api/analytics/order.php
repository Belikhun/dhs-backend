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

	define("ORDER_LOG_FILE", $_SERVER["DOCUMENT_ROOT"]. "/data/orderLogs.data");
	
	// SET PAGE TYPE
	define("PAGE_TYPE", "API");

	if (getForm("action") === "getData") {
		if (!isLoggedIn())
			stop(11, "Bạn chưa đăng nhập!", 401);

		if ($_SESSION["id"] !== "admin")
			stop(31, "Access Denied!", 403);

		checkToken();

		$orderLogs = unserialize((new fip(ORDER_LOG_FILE, "a:0:{}")) -> read());
		stop(0, "Success", 200, $orderLogs, true);
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

	$orderLogs = new fip(ORDER_LOG_FILE, "a:0:{}");
	$logs = unserialize($orderLogs -> read());
	array_push($logs, $data);
	$orderLogs -> write(serialize($logs));

	stop(0, "Success!", 200, $data);
