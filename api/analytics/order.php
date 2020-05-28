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
		
		// READ CHUNKS
		$orderChunk = Array();
		$orderChunks = glob(ORDERLOG_ROOT ."/chunk.*", GLOB_NOSORT);

		foreach ($orderChunks as $file)
			$orderChunk = array_merge($orderChunk, unserialize((new fip($file)) -> read()));

		// MERGE FILES
		$orderFragment = Array();
		$orderFragments = glob(ORDERLOG_ROOT ."/fragment.*", GLOB_NOSORT);

		foreach ($orderFragments as $file)
			array_push($orderFragment, unserialize((new fip($file)) -> read()));

		if (count($orderFragment) > 200) {
			(new fip(ORDERLOG_ROOT ."/chunk.". $orderFragment[0]["time"] * 10000 .".". $orderFragment[count($orderFragment) - 1]["time"] * 10000, "a:0:{}")) -> write(serialize($orderFragment));

			// CLEAN
			foreach ($orderFragments as $file)
				unlink($file);
		}

		// DATA PROCESS
		$orderList = array_merge($orderFragment, $orderChunk);
		usort($orderList, function($a, $b) { return $a["time"] > $b["time"]; });
		
		stop(0, "Success", 200, array_reverse($orderList), true);
	}

    if (!isset($_SESSION["authKey"]))
        stop(-1, "Đã có lỗi không mong muốn xảy ra!", 500);

    $key = $_SESSION["authKey"];
    $keyDB = new ezsql(DB_TABLE);
    
    $query = "SELECT `id`, `name` FROM `keylist` WHERE `key` = ?";
    $result = $keyDB -> query($query, $key);

    if (empty($result))
		stop(-1, "Key không tồn tại trong máy chủ!", 403, Array( "key" => $key ));
	
	checkToken();
	$timestamp = microtime(true);

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
		"time"		=>	$timestamp
	);

	$orderFragment = new fip(ORDERLOG_ROOT ."/fragment.". $result[0]["id"] .".". $timestamp * 10000, "a:0:{}");
	$orderFragment -> write(serialize($data));

	stop(0, "Success!", 200, $data);