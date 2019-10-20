<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/scripts/list.php                                                                        |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2019 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "API");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ezsql.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

    checkToken();

    if (!isset($_SESSION["authKey"]))
        stop(-1, "Đã có lỗi không mong muốn xảy ra!", 500);

    $key = $_SESSION["authKey"];
    $keyDB = new ezsql(DB_TABLE);
    
    $query = "SELECT * FROM `keylist` WHERE `key` = ?";
    $result = $keyDB -> query($query, $key);

    if (empty($result))
        stop(-1, "Key không tồn tại trong máy chủ!", 403, Array( "key" => $key ));

    $allow = explode(";", $result[0]["allow"]);

    $scriptData = Array();
    $list = glob(SCRIPTS_DIR ."/*", GLOB_ONLYDIR);
    sort($list, SORT_NATURAL);
    
    foreach ($list as $key => $item) {
        $id = pathinfo($item, PATHINFO_BASENAME);
        $data = json_decode((new fip($item ."/manifest.json", "{}")) -> read(), true);

        $scriptData[$id] = $data;
        $scriptData[$id]["id"] = $id;
        $scriptData[$id]["allow"] = (in_array($id, $allow) || $result[0]["allow"] === "*");
    }

    stop(0, "Thành công!", 200, $scriptData);