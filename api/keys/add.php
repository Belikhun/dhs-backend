<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/keys/add.php                                                                            |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "API");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/logs.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ezsql.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

    if (!isLoggedIn())
        stop(11, "Bạn chưa đăng nhập!", 403);

    if ($_SESSION["id"] !== "admin")
        stop(31, "Access Denied!", 403);

    $formData = reqData("json");
    checkToken(reqKey($formData, "token"));

    $name = reqKey($formData, "name");
    $key = reqKey($formData, "key");
    $licenses = reqKey($formData, "licenses");
    $tags = getKey($formData, "tags", []);

    // VERIFY DATA
    if (!is_array($licenses))
        stop(3, "Licenses is not an array", 400);

    if (!is_array($tags))
        stop(3, "Tags is not an array", 400);

    foreach ($licenses as $index => $value)
        if ((!isset($value["allow"])) || (!isset($value["expire"]) || !is_numeric($value["expire"]) || !is_string($value["allow"])))
            stop(-1, "Inaccurate Data", 400, Array( "index" => $index ));

    $keyDB = new ezsql(DB_TABLE);
    
    $query = "INSERT INTO `keylist` (`name`, `key`, `licenses`, `createdate`, `lastused`, `tags`) VALUES (?, ?, ?, ?, ?, ?)";
    $result = $keyDB -> query($query, $name, $key, serialize($licenses), time(), time(), serialize($tags));

    writeLog("OKAY", "Đã thêm key vào cơ sở dữ liệu: $name [$key]");
    stop(0, "Thêm key vào cơ sở dữ liệu thành công!", 200, Array( "name" => $name, "key" => $key, "licenses" => $licenses ));