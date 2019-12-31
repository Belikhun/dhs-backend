<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/auth.php                                                                                |
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

    $key = reqForm("key");

    $keyDB = new ezsql(DB_TABLE);
    
    $query = "SELECT * FROM `keylist` WHERE `key` = ?";
    $result = $keyDB -> query($query, $key);

    if (empty($result))
        stop(50, "Key không tồn tại trong máy chủ!", 403, Array( "key" => $key ));

    $result = $result[0];

    if (time() > $result["expire"])
        stop(51, "Key đã hết hạn!", 403, Array( "key" => $key, "expire" => $result["expire"], "expired" => time() - $result["expire"] ));

    if (!isset($_SESSION["authKey"]) || $_SESSION["authKey"] !== $key) {
        $_SESSION["apiToken"] = bin2hex(random_bytes(64));
        $_SESSION["authKey"] = $key;
    }
    
    $keyDB -> query("UPDATE `keylist` SET `lastused` = ? WHERE `key` = ?", time(), $key);
    session_regenerate_id();

    $result["tags"] = unserialize($result["tags"]);

    writeLog("OKAY", "Đã cấp quyền truy cập cho \"". $result["name"] ."\" [". session_id() ."]");
    stop(0, "Đã cấp quyền truy cập", 200, Array(
        "token" => $_SESSION["apiToken"],
        "sessid" => session_id(),
        "keyData" => $result
    ));