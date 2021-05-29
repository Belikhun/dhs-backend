<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/keys/edit.php                                                                           |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "API");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/logger.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ezsql.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

    if (!isLoggedIn())
        stop(11, "Bạn chưa đăng nhập!", 403);

    if ($_SESSION["id"] !== "admin")
        stop(31, "Access Denied!", 403);

    $formData = reqData("json");
    checkToken(reqKey($formData, "token"));

    $keyID = reqKey($formData, "id");
    $name = getKey($formData, "name");
    $key = getKey($formData, "key");
    $licenses = getKey($formData, "licenses", []);
    $tags = getKey($formData, "tags", []);

    // VERIFY DATA
    if (!is_array($licenses))
        stop(3, "Licenses is not an array", 400);

    if (!is_array($tags))
        stop(3, "Tags is not an array", 400);

    foreach ($licenses as $index => $value)
        if ((!isset($value["allow"])) || (!isset($value["expire"]) || !is_numeric($value["expire"]) || !is_string($value["allow"])))
            stop(-1, "Inaccurate Data", 400, Array( "index" => $index ));

    $toChange = array_filter(Array(
        "name" => $name,
        "key" => $key,
        "tags" => serialize($tags),
        "licenses" => serialize($licenses)
    ));

    $keyDB = new ezsql(DB_TABLE);
    
    foreach ($toChange as $key => $value) {
        $query = "UPDATE `keylist` SET `$key` = ? WHERE `id` = ?";
        $result = $keyDB -> query($query, $value, $keyID);
    }

    writeLog("OKAY", "Đã chỉnh sửa key trong cơ sở dữ liệu: ID $keyID");
    stop(0, "Chỉnh sửa key trong cơ sở dữ liệu thành công!", 200, $toChange);