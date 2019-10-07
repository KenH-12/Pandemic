class Step
{
    constructor(name, description, substeps)
    {
        this.name = name;
		this.description = description;
		this.substeps = substeps;
	}
	
	begin = function()
	{
		this.substepIndex = -1;
		this.proceed();
	}

	proceed = function(...args)
	{
		if (++this.substepIndex == this.substeps.length)
			this.end();
		else
			this.substeps[this.substepIndex](...args);
	}

	end = function()
	{
		setCurrentStep(this.nextStep).begin();
	}
}