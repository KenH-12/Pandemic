<?php
	try
	{
		session_start();
		require "../connect.php";
		
		if (!isset($_SESSION["game"]))
			throw new Exception("Game not found");
		
		// get all player cards which are in a player's hand or the discard pile
		$stmt = $pdo->prepare("SELECT pileID, pile, cardKey as `key`
							FROM pandemic.vw_playerCard
							WHERE game = ?
							AND pile != 'deck'
							ORDER BY pileID, cardIndex");
		$stmt->execute([$_SESSION["game"]]);
		$response = $stmt->fetchAll();
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
