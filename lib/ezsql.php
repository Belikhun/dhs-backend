<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /lib/ezsql.php                                                                               |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/dbinfo.php";

    define("EZSQL_OKAY", 0);
    define("EZSQL_ERROR_QUERRY", 1);

    class ezsql {
        private $DB_SERVER = DB_SERVER;
        private $DB_USERNAME = DB_USERNAME;
        private $DB_PASSWORD =  DB_PASSWORD;
        private $DB_DATABASE = "";
        public $mysqli = null;
        
        public function __construct($database) {
            $this -> DB_DATABASE = $database;

            $this -> mysqli = new mysqli(
                $this -> DB_SERVER,
                $this -> DB_USERNAME,
                $this -> DB_PASSWORD,
                $this -> DB_DATABASE
            );
        }

        public function query(String $query, ...$params) {
            $types = "";
            $typeList = Array(
                "string" => "s",
                "dobule" => "d",
                "integer" => "i",
                "array" => "b"
            );

            foreach ($params as $key => $value)
                $types = $types . $typeList[gettype($value)] ?: "s";

            $stmt = $this -> mysqli -> prepare($query);

            if ($stmt === false)
                stop(-1, "MySQLi Error: ". $this -> mysqli -> error, 500, Array(
                    "code" => $this -> mysqli -> errno,
                    "description" => $this -> mysqli -> error
                ));

            if (!empty($params))
                $stmt -> bind_param($types, ...$params);

            $stmt -> execute();

            // Check for error
            if ($stmt -> errno)
                stop(-1, "MySQLi Error: ". $stmt -> error, 500, Array(
                    "code" => $stmt -> errno,
                    "description" => $stmt -> error
                ));

            $data = Array();
            $res = $stmt -> get_result();

            if (is_bool($res))
                return $res;

            while ($row = $res -> fetch_array(MYSQLI_ASSOC))
                array_push($data, $row);

            $stmt -> close();
            return $data;
        }
    }