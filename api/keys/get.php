<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/keys/list.php                                                                           |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "API");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/logs.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ezsql.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

    if (!isLoggedIn())
        stop(11, "Bạn chưa đăng nhập!", 403);

    checkToken();

    if ($_SESSION["id"] !== "admin")
        stop(31, "Access Denied!", 403);

    $singleMode = false;
    $keyID = getForm("id");
    $keyDB = new ezsql(DB_TABLE);
    $query = "SELECT * FROM `keylist`";

    if (!empty($keyID) || $keyID === "0") {
        $singleMode = true;
        $query = "SELECT * FROM `keylist` WHERE `id` = ?";
        $result = $keyDB -> query($query, $keyID);
    } else
        $result = $keyDB -> query($query);

    $curTime = time();

    foreach ($result as &$v) {
        $v["licenses"] = unserialize($v["licenses"]);
        $v["tags"] = unserialize($v["tags"]);
        $v["expired"] = true;

        foreach ($v["licenses"] as &$n) {
            $n["valid"] = $n["expire"] - $curTime;
            $n["expired"] = $n["valid"] < 0 ? true : false;

            if ($n["expired"] === false)
                $v["expired"] = false;
        }
    }

    if ($singleMode)
        $result = $result[0];

    stop(0, "Lấy danh sách thành công!", 200, $result);