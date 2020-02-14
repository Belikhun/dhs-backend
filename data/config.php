<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /data/config.php                                                                             |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

	require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
	require_once $_SERVER["DOCUMENT_ROOT"] ."/data/info.php";

	// get and parse config data from config file
	$config = json_decode((new fip($_SERVER["DOCUMENT_ROOT"] ."/data/config.json")) -> read(), true);
	$rawConfig = $config;

	date_default_timezone_set($config["time"]["zone"]);

	function applyCustomVar(&$string) {
		global $config;
		$s = $string;
		$list = Array(
			"name" => APPNAME,
			"version" => VERSION,
			"author" => AUTHOR
		);

		foreach ($list as $key => $value)
			if (!empty($value))
				$s = str_replace("%". $key ."%", $value, $s);

		$string = $s;
	}

	applyCustomVar($config["pageTitle"]);

	function saveConfig(Array $config) {
		unset($config["time"]["begin"]["times"]);
		unset($config["logDir"]);
		(new fip($_SERVER["DOCUMENT_ROOT"] ."/data/config.json")) -> write(json_encode($config, JSON_PRETTY_PRINT));
	}