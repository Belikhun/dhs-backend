<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/keys/remove.php                                                                         |
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

    checkToken();

    if ($_SESSION["id"] !== "admin")
        stop(31, "Access Denied!", 403);

    $keyID = reqForm("id");

    $keyDB = new ezsql(DB_TABLE);
    
    $query = "DELETE FROM `keylist` WHERE `id` = ?";
    $result = $keyDB -> query($query, $keyID);

    writeLog("OKAY", "Đã xóa key khỏi cơ sở dữ liệu: ID [$keyID]");
    stop(0, "Xóa key khỏi cơ sở dữ liệu thành công!", 200, Array( "id" => $keyID ));