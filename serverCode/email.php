<?php
require 'vendor/autoload.php';

use Mailgun\Mailgun;

function sendEmail($to, $subject, $text)
{
	$mg = Mailgun::create(getenv('MAILGUN_API_KEY'));

	$result = $mg->messages()->send(
		'kenhenderson.ca',
		[
			'from' => 'KenBot <mail@kenhenderson.ca>',
			'to' => $to,
			'subject' => $subject,
			'text' => $text
		]
	);

	return $result;
}

function sendVerificationCode($pdo, $userID)
{
    $stmt = $pdo->prepare("SELECT username, email FROM `user` WHERE userID = ?");
    $stmt->execute([$userID]);

    if ($stmt->rowCount() === 0)
    {
        session_start();
        unset($_SESSION["uID"]);
        throw new Exception("user not logged in");
    }

    $userDetails = $stmt->fetch();
    $username = $userDetails["username"];
    $to = $userDetails["email"];

    $code = newVerificationOrSecurityCode($pdo, $userID);

    $subject = "Pandemic Account Verification";
    $message = "Hello, $username.\nVerify your Pandemic account using this code: $code\n(code will expire in 10 minutes)";

    return sendEmail($to, $subject, $message);
}
?>