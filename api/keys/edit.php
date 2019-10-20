<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/keys/edit.php                                                                           |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2019 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "API");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/logs.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ezsql.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

    if (!isLogedIn())
        stop(11, "Bạn chưa đăng nhập!", 403);

    checkToken();

    if ($_SESSION["id"] !== "admin")
        stop(31, "Access Denied!", 403);

    $keyID = reqForm("id");

    $name = getForm("name");
    $key = getForm("key");
    $allow = getForm("allow");
    $expire = getForm("expire");

    $toChange = array_filter(Array(
        "name" => $name,
        "key" => $key,
        "allow" => $allow,
        "expire" => (int) $expire
    ));

    $keyDB = new ezsql(DB_TABLE);
    
    foreach ($toChange as $key => $value) {
        $query = "UPDATE `keylist` SET `$key` = ? WHERE `id` = ?";
        $result = $keyDB -> query($query, $value, $keyID);
    }

    writeLog("OKAY", "Đã chỉnh sửa key trong cơ sở dữ liệu: ID ". $key);
    stop(0, "Chỉnh sửa key trong cơ sở dữ liệu thành công!", 200, $toChange);