<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/scripts/fetch.php                                                                       |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2019 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "NORMAL");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/logs.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ezsql.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

    $id = reqForm("id");

    checkToken();

    if (!isset($_SESSION["authKey"]))
        stop(-1, "Đã có lỗi không mong muốn xảy ra!", 500);

    $key = $_SESSION["authKey"];
    $keyDB = new ezsql(DB_TABLE);
    
    $query = "SELECT `allow` FROM `keylist` WHERE `key` = ?";
    $result = $keyDB -> query($query, $key);

    if (empty($result))
        stop(-1, "Key không tồn tại trong máy chủ!", 403, Array( "key" => $key ));

    $allow = explode(";", $result[0]["allow"]);

    if (!(in_array($id, $allow) || $result[0]["allow"] === "*"))
        stop(31, "Bạn không có quyền xem Script ID: ". $id, 403, Array( "id" => $id ));

    $scriptDir = SCRIPTS_DIR ."/". $id;
    $scriptFile = $scriptDir ."/script.js";

    if (file_exists($scriptDir ."/script.min.js"))
        $scriptFile = $scriptDir ."/script.min.js";
    
    if (!file_exists($scriptDir) || !file_exists($scriptFile))
        stop(44, "Không tìm thấy Script ID: ". $id, 404, Array( "id" => $id ));

    contentType("js");
    readfile($scriptFile);