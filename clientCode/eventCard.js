export default class EventCard
{
    constructor(key, name)
    {
        this.key = key;
        this.name = name;
    }

    getPlayerCard({ noTooltip })
	{
		const tooltip = noTooltip ? "" : " title='Event card'";

		return `<div class='playerCard eventCard' data-key='${this.key}'${tooltip}>${this.name.toUpperCase()}</div>`;
	}
}