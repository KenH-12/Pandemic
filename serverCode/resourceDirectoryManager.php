<?php
    function getResourceDirectory()
    {
        foreach (scandir(".") as $dir)
            if (substr($dir, 0, 4) === "res_")
                return $dir;
    }
?>