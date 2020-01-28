<?php

function getEventById($mysqli, $game, $eventID)
{
    $result = $mysqli->query("SELECT * FROM vw_event WHERE game = $game AND id = $eventID");
    
    if ($result->num_rows === 0)
        throw new Exception("the event does not exist.");
    
    return $result->fetch_assoc();
}

// Throws an Exception if undoing $event is not allowed.
function validateEventCanBeUndone($mysqli, $game, $event)
{
    $disallowedEventTypes = array("sh", "ii", "cd", "ic", "ec", "ef", "et", "ob", "oi", "fd", "ge");

    $eventType = $event["eventType"];
    if (in_array($eventType, $disallowedEventTypes))
        throw new Exception("events of type '$eventType' cannot be undone.");
    
    $eventID = $event["id"];
    $eventsAfterEvent = $mysqli->query("SELECT eventType FROM vw_event
                                        WHERE game = $game
                                        AND id > $eventID");
    
    $disallowedEventsOccured = false;
    $notLastUndoableEvent = false;
    $undoableTriggeredEventTypes = array("at", "er");
    while ($row = mysqli_fetch_assoc($eventsAfterEvent))
    {
        $eventType = $row["eventType"];
        if (in_array($eventType, $disallowedEventTypes))
        {
            $disallowedEventsOccured = true;
            break; // because this condition takes precendence over the $notLastUndoableEvent condition.
        }
        
        if (!in_array($eventType, $undoableTriggeredEventTypes))
            $notLastUndoableEvent = true;
    }

    if ($disallowedEventsOccured)
        throw new Exception("one or more events which cannot be undone occured after the event in question.");
        
    if ($notLastUndoableEvent)
        throw new Exception("one or more undoable events occured after the event in question.");
}

function undoEventsTriggeredByEvent($mysqli, $game, $triggerEventID)
{
    $AUTO_TREAT_DISEASE = "at";
    $ERADICATION = "er";
    
    $eventsAfterEvent = $mysqli->query("SELECT * FROM vw_event
                                        WHERE game = $game
                                        AND id > $triggerEventID");
    
    while ($event = mysqli_fetch_assoc($eventsAfterEvent))
    {
        $eventType = $event["eventType"];

        if ($eventType === $AUTO_TREAT_DISEASE)
            undoAutoTreatDiseaseEvent($mysqli, $game, $event);
        else if ($eventType === $ERADICATION)
            undoEradicationEvent($mysqli, $game, $event);
        else
            throw new Exception("Failed to undo events triggered by event -- unexpected event type found: '$eventType'");
    }
}

function undoAutoTreatDiseaseEvent($mysqli, $game, $event)
{
    $eventDetails = explode(",", $event["details"]);
    
    include "../utilities.php";
    addCubesToCity($mysqli, $game, $eventDetails["cityKey"], $eventDetails["diseaseColor"], $eventDetails["numCubesRemoved"]);

    deleteEvent($mysqli, $game, $event["id"]);
}

function undoEradicationEvent($mysqli, $game, $event)
{
    $column = $event["details"] . "StatusID";

    $mysqli->query("UPDATE pandemic
                    SET $column = getDiseaseStatusID('cured')
                    WHERE gameID = $game");

    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to undo Eradication event: " . $mysqli->error);
    
    deleteEvent($mysqli, $game, $event["id"]);
}

function deleteEvent($mysqli, $game, $eventID)
{
    $mysqli->query("DELETE FROM vw_event
                    WHERE game = $game
                    AND id = $eventID");

    if ($mysqli->affected_rows != 1)
        throw new Exception("Failed to delete event: " . $mysqli->error);
}

?>