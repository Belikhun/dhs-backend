<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/account/get.php                                                                         |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "API");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/logs.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

    if (!isLoggedIn())
        stop(11, "Bạn chưa đăng nhập.", 401);
        
    checkToken();

    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/account.php";
    if (getUserData($_SESSION["username"])["id"] !== "admin")
        stop(31, "Access Denied!", 403);

    $username = getForm("username");

    stop(0, "Thành công!", 200, $username ? $accountData[$username] : $accountData);