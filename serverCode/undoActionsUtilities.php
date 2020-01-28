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

?>