"use strict";

import { gameData } from "./gameData.js";

const sizeRatios = {};
class SizeRatio
{
    constructor(name, base, ratioToBase)
    {
        this.name = name;
        this.base = base;
        this.ratioToBase = ratioToBase;

        sizeRatios[name] = this;
    }

    getDimension({ compliment, getFactor, format } = {})
    {
        const { ratioToBase, base } = this;
        let factor = compliment ? 1 - ratioToBase : ratioToBase;        

        if (format === "percent")
            factor *= 100;
        
        if (getFactor)
            return factor;
        
        return Math.round(gameData[base] * factor);
    }
}

new SizeRatio("piecePlacementThreshold",    "boardWidth", 0.023);
new SizeRatio("playerCardWidth",            "panelWidth", 0.98);
new SizeRatio("cubeSupplyMarginTop",        "topPanelHeight", 0.087);
new SizeRatio("bottomPanelDivs",            "boardHeight", 0.222);
new SizeRatio("cureMarkerMarginTop",        "boardHeight", 0.931);
new SizeRatio("cityWidth",                  "boardWidth", 0.012);
new SizeRatio("autoTreatCircleWidth",       "boardWidth", 0.036);
new SizeRatio("cubeWidth",                  "boardWidth", 0.016);
new SizeRatio("infGroupAdj",                "boardHeight", 0.025);
new SizeRatio("groupInfRateCubeWidth",      "panelWidth", 0.117);
new SizeRatio("infCardDiv",                 "boardHeight", 0.047);
new SizeRatio("diseaseIcon",                "panelWidth", 0.1048);
new SizeRatio("discardDiseaseIcon",         "boardWidth", 0.023);
new SizeRatio("infCardHeight",              "panelWidth", 0.105);
new SizeRatio("infCardFont",                "panelWidth", 0.063);
new SizeRatio("infCardNameTop",             "panelWidth", 0.0205);
new SizeRatio("infDiscardHeight",           "boardWidth", 0.0192);
new SizeRatio("infDiscardFont",             "boardWidth", 0.0136);
new SizeRatio("infDiscardNameTop",          "boardWidth", 0.0038);
new SizeRatio("outbreaksMarkerLeft",        "boardWidth", 0.028);
new SizeRatio("outbreaksMarkerRight",       "boardWidth", 0.067);
new SizeRatio("stationSupplyCountFont",     "boardWidth", 0.0208);
new SizeRatio("specialEventImgMarginLeft",  "windowWidth", 0.47);

// Facilitates responsiveness where simple css rules fail.
// Returns a dimension value calculated using sizeRatios.
export default function getDimension(dimensionName, { compliment, getFactor, format } = {})
{
    return sizeRatios[dimensionName].getDimension({ compliment, getFactor, format });
}