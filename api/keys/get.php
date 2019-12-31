<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/keys/list.php                                                                           |
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

    $keyDB = new ezsql(DB_TABLE);
    
    $query = "SELECT * FROM `keylist`";
    $result = $keyDB -> query($query);

    $keyID = getForm("id");

    array_walk($result, function(&$v) {
        $v["valid"] = $v["expire"] - time();
        $v["expired"] = $v["valid"] < 0 ? true : false;
        $v["tags"] = unserialize($v["tags"]);
    });

    if (!empty($keyID)) {
        $pos = array_search($keyID, array_column($result, "id"));
        $result = $result[$pos];
    }

    stop(0, "Lấy danh sách thành công!", 200, $result);