<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/scripts/fetch.php                                                                       |
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

    $id = reqForm("id");

    checkToken();

    if (!isset($_SESSION["authKey"]))
        stop(-1, "Đã có lỗi không mong muốn xảy ra!", 500);

    $key = $_SESSION["authKey"];
    $keyDB = new ezsql(DB_TABLE);
    
    $query = "SELECT `licenses` FROM `keylist` WHERE `key` = ?";
    $result = $keyDB -> query($query, $key);

    if (empty($result))
        stop(-1, "Key không tồn tại trong máy chủ!", 403, Array( "key" => $key ));

    $licensesList = unserialize($result[0]["licenses"]);
    $curTime = time();
    $allowAccess = false;

    foreach ($licensesList as $license) {
        $allow = explode(";", $license["allow"]);
    
        if (($license["allow"] === "*" || in_array($id, $allow)) && (($license["expire"] - $curTime) > 0)) {
            $allowAccess = true;
            break;
        }
    }

    if (!$allowAccess)
        stop(31, "Bạn không có quyền xem Script ID: ". $id, 403, Array( "id" => $id ));

    $scriptDir = SCRIPTS_DIR ."/". $id;
    $scriptFile = $scriptDir ."/script.js";

    if (file_exists($scriptDir ."/script.min.js"))
        $scriptFile = $scriptDir ."/script.min.js";
    
    if (!file_exists($scriptDir) || !file_exists($scriptFile))
        stop(44, "Không tìm thấy Script ID: ". $id, 404, Array( "id" => $id ));

    $script = (new fip($scriptFile, "")) -> read();

    // BEGIN ENCRYPTION
    $iv = random_bytes(16);
    $ivHex = bin2hex($iv);
    $secret = hash_hmac("sha256", $_SESSION["apiToken"] . $ivHex, $_SESSION["authKey"], true);
    $encrypted = openssl_encrypt($script, "AES-256-CBC", $secret, 0, $iv);

    if ($encrypted === false)
        stop(-1, "Thất bại khi mã hóa dữ liệu", 500);

    stop(0, "Success", 200, Array(
        "script" => $encrypted,
        "iv" => $ivHex
    ));