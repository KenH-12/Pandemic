<?php
	try
	{
		session_start();
		require "../connect.php";
		include "../utilities.php";
		
		if (!isset($_SESSION["game"]))
			throw new Exception("Game not found");
		
		$stmt = $pdo->prepare("SELECT	id,
										turnNum,
										role,
										eventType AS 'code',
										details
								FROM pandemic.vw_event
								WHERE game = ?
								ORDER BY id");
		$stmt->execute([$_SESSION["game"]]);
		$events = $stmt->fetchAll();

		$EPIDEMIC_INTENSIFY_CODE = "et";
		foreach ($events as $row)
		{
			if ($row["code"] === $EPIDEMIC_INTENSIFY_CODE)
				$row["cardKeys"] = getEpidemicIntensifyCardKeys($pdo, $row["id"]);

			$response[] = $row;
		}
	}
	catch(Exception $e)
	{
		$response["failure"] = $e->getMessage();
	}
	finally
	{
		echo json_encode($response);
	}
?>