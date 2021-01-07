<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/updates/latest.php                                                                      |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "NORMAL");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/libs/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/info.php";

    $type = getQuery("type", "crx");
    $file = ($type === "zip") ? EXTENSION_ZIP_PATH : EXTENSION_CRX_PATH;

    if (!file_exists($file))
        stop(44, "Không tìm thấy tệp cập nhật loại \"$type\"", 404);

    contentType(pathinfo($file, PATHINFO_EXTENSION));
    header("Content-Disposition: attachment; filename=\"". pathinfo($file, PATHINFO_BASENAME) ."\"");
    readfile($file);