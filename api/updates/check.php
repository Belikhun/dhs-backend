<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /api/updates/check.php                                                                       |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2019 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "NORMAL");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ratelimit.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

    contentType("xml");

    print "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>";
?>
<gupdate xmlns='http://www.google.com/update2/response' protocol="2.0">
    <app appid="<?php print EXTENSION_ID; ?>">
        <updatecheck codebase="https://<?php print HOST_NAME; ?>/api/updates/latest" version="<?php print EXTENSION_VERSION; ?>" />
    </app>
</gupdate>