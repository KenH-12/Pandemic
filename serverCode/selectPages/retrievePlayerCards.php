<?php
	session_start();
	
	if (isset($_SESSION["game"]))
	{
		$game = $_SESSION["game"];
		
		require "../connect.php";
		
		// get all player cards which are in a player's hand or the discard pile
		$cards = $mysqli->query("SELECT pileID, cardKey as `key`
								FROM vw_playerCard
								WHERE game = $game
								AND pile NOT IN ('deck', 'contingency', 'removed')
								ORDER BY pileID, cardIndex");
		
		$response = array();
		while ($row = mysqli_fetch_assoc($cards))
		{
			$response[] = $row;
		}
		
		$mysqli->close();
	}
	
	echo json_encode($response);
?>
