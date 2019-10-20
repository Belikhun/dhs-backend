<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/keys/add.php                                                                            |
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

    $name = reqForm("name");
    $key = reqForm("key");
    $allow = reqForm("allow");
    $expire = reqForm("expire");

    $keyDB = new ezsql(DB_TABLE);
    
    $query = "INSERT INTO `keylist` (`name`, `key`, `allow`, `createdate`, `lastused`, `expire`) VALUES (?, ?, ?, ?, ?, ?)";
    $result = $keyDB -> query($query, $name, $key, $allow, time(), time(), $expire);

    writeLog("OKAY", "Đã thêm key vào cơ sở dữ liệu: ". $key);
    stop(0, "Thêm key vào cơ sở dữ liệu thành công!", 200, Array( "name" => $name, "key" => $key, "expire" => $expire ));