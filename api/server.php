<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/server.php                                                                              |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "API");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

    $accountList = null;

    if (isset($_SESSION["authKey"])) {
        // BEGIN ENCRYPTION
        $iv = random_bytes(16);
        $ivHex = bin2hex($iv);

        $secret = hash_hmac("sha256", $_SESSION["authKey"] . $ivHex, $_SESSION["apiToken"], true);
        $encrypted = openssl_encrypt(json_encode($config["tikiHuntAccountList"]), "AES-256-CBC", $secret, 0, $iv);
    
        if ($encrypted === false)
            stop(-1, "Thất bại khi mã hóa dữ liệu", 500);
    
        $accountList = Array(
            "list" => $encrypted,
            "iv" => $ivHex
        );
    }

    stop(0, "Success", 200, Array(
        "version" => VERSION,
        "versionTag" => VERSION_TAG,
        "author" => AUTHOR,
        "contestName" => $config["app"]["title"],
        "contestDescription" => $config["app"]["description"],
        "username" => $_SESSION["username"] ?: null,
        "CONTACT" => CONTACT_LINK,
        "EXTENSION_VERSION" => EXTENSION_VERSION,
        "EXTENSION_UPDATE" => "/api/updates/latest",
        "EXTENSION_ANNOUNCEMENT" => $config["announcement"],
        "API_TOKEN" => isset($_SESSION["apiToken"]) ? $_SESSION["apiToken"] : null,
        "REPO_ADDRESS" => REPO_ADDRESS,
        "REPORT_ERROR" => REPORT_ERROR,
        "SERVER_LOAD" => function_exists("sys_getloadavg") ? sys_getloadavg()[0] : null,
        "SERVER_SOFTWARE" => $_SERVER["SERVER_SOFTWARE"],
        "SERVER_ADDR" => $_SERVER["SERVER_ADDR"],
        "SERVER_PROTOCOL" => $_SERVER["SERVER_PROTOCOL"],
        "HTTP_USER_AGENT" => $_SERVER["HTTP_USER_AGENT"],
        "REMOTE_ADDR" => $_SERVER["REMOTE_ADDR"],
        "config" => Array(
            "allowRegister" => $config["allowRegister"],
            "accountList" => $accountList
        )
    ));