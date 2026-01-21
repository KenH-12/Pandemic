"use strict";

function distanceBetweenPoints(pointA, pointB)
{
	return Math.sqrt(Math.pow(Math.abs(pointA.left - pointB.left), 2) + Math.pow(Math.abs(pointA.top - pointB.top), 2));
}

function slopeOfLine(a, b)
{
	return (a.top - b.top) / (a.left - b.left);
}

function getPerpendicularSlope(a, b)
{
	const slope =  slopeOfLine(a, b);

	if (slope === Infinity || slope === -Infinity)
		return 0;
	
	return -(1/slope);
}

function getYIntercept(a, b)
{
	return a.top - slopeOfLine(a, b)*a.left;
}

function getYInterceptFromSlope(point, slope)
{
	return point.top - slope*point.left;
}

function getVector(a, b)
{
	return {
		left: b.left - a.left,
		top: b.top - a.top
	};
}

function getVectorLength(v)
{
	return Math.sqrt( Math.pow(v.left,2) + Math.pow(v.top,2) );
}

function normalizeVector(v)
{
	const vLength = getVectorLength(v);
	return {
		left: v.left / vLength,
		top: v.top / vLength
	};
}

function getArrowClipPath({ baseOffset, tipOffset, stemWidth, headWidth, headLength, containerWidth, containerHeight } = {})
{
	headWidth = headWidth || stemWidth * 3;
	headLength = headLength || headWidth;
	
	const arrowheadBase = getPointAtDistanceAlongLine(tipOffset, baseOffset, headLength),
		halfStemWidth = stemWidth / 2,
		halfHeadWidth = headWidth / 2,
		pointProperties = [
			{ vectorPoint: arrowheadBase, belowLine: true, distanceFromVector: halfHeadWidth },
			{ vectorPoint: arrowheadBase, belowLine: true, distanceFromVector: halfStemWidth },
			{ vectorPoint: baseOffset, belowLine: true, distanceFromVector: halfStemWidth },
			{ vectorPoint: baseOffset, belowLine: false, distanceFromVector: halfStemWidth },
			{ vectorPoint: arrowheadBase, belowLine: false, distanceFromVector: halfStemWidth },
			{ vectorPoint: arrowheadBase, belowLine: false, distanceFromVector: halfHeadWidth }
		],
		perpendicularSlope = getPerpendicularSlope(baseOffset, tipOffset),
		points = [tipOffset];

	for (let i = 0; i < pointProperties.length; i++)
	{
		const {
			vectorPoint,
			belowLine,
			distanceFromVector
		} = pointProperties[i];

		points.push(getPointAtDistancePerpendicularToLine({ a: vectorPoint, distance: distanceFromVector }, {
				perpendicularSlope,
				belowLine
			}));
	}

	return getClipPathPolygonFromPoints(containerWidth, containerHeight, points);
}

function getPointAtDistancePerpendicularToLine({ a, distance }, {
		b,
		perpendicularSlope,
		belowLine
	} = {})
{
	perpendicularSlope = isNaN(perpendicularSlope) ? getPerpendicularSlope(a, b) : perpendicularSlope;

	const perpendicularDirection = belowLine ? -1 : 1;

	if (perpendicularSlope === Infinity || perpendicularSlope === -Infinity)
	{
		return {
			left: a.left,
			top: a.top + distance*perpendicularDirection
		}
	}

	const somePerpendicularX = a.left - distance*perpendicularDirection,
		somePerpendicularPoint = {
			left: somePerpendicularX,
			top: perpendicularSlope*somePerpendicularX + getYInterceptFromSlope(a, perpendicularSlope)
		};
	
	return getPointAtDistanceAlongLine(a, somePerpendicularPoint, distance);
}

function getPointAtDistanceAlongLine(a, b, distanceFromA)
{
	const u = normalizeVector(getVector(a, b));
	
	return {
		left: a.left + (distanceFromA*u.left),
		top: a.top + (distanceFromA*u.top)
	};
}

function getClipPathPolygonFromPoints(containerWidth, containerHeight, points)
{
	let clipPath = "polygon(";

	for (let point of points)
		clipPath += `${(point.left / containerWidth * 100).toFixed(2)}% ${(point.top / containerHeight * 100).toFixed(2)}%,`;
	
	clipPath = clipPath.substring(0, clipPath.length - 1);
	clipPath += ")";

	return clipPath;
}