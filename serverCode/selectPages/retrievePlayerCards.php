<?php
	try
	{
		session_start();
		require "../connect.php";
		
		if (!isset($_SESSION["game"]))
			throw new Exception("Game not found");
		
		$game = $_SESSION["game"];
		
		// get all player cards which are in a player's hand or the discard pile
		$cards = $mysqli->query("SELECT pileID, pile, cardKey as `key`
								FROM vw_playerCard
								WHERE game = $game
								AND pile NOT IN ('deck')
								ORDER BY pileID, cardIndex");
		
		$response = array();
		while ($row = mysqli_fetch_assoc($cards))
		{
			$response[] = $row;
		}
	}
	catch(Exception $e)
	{
		$response["failure"] = $e->getMessage();
	}
	finally
	{
		$mysqli->close();

		echo json_encode($response);
	}
?>
