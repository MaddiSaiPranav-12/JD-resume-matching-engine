/**
 * Match Percentage Calculator
 * Computes skill-based matching scores without embeddings
 */

class MatchCalculator {
    /**
     * Calculate match percentage between JD and Resume skills
     * @param {Array<string>} jdSkills - Required skills from job description
     * @param {Array<string>} resumeSkills - Skills from candidate resume
     * @returns {Object} - Match result with score and skill breakdown
     */
    calculateSkillMatch(jdSkills, resumeSkills) {
        console.log('Calculating match for:', { jdSkills, resumeSkills });
        
        if (!jdSkills || !jdSkills.length) {
            return {
                matchScore: 0,
                matchedSkills: [],
                missingSkills: [],
                extraSkills: resumeSkills || [],
                totalRequired: 0,
                totalMatched: 0
            };
        }
        
        if (!resumeSkills || !resumeSkills.length) {
            return {
                matchScore: 0,
                matchedSkills: [],
                missingSkills: [...jdSkills],
                extraSkills: [],
                totalRequired: jdSkills.length,
                totalMatched: 0
            };
        }

        const matchedSkills = [];
        const missingSkills = [];

        // Find matched skills (case-insensitive partial matching)
        jdSkills.forEach(jdSkill => {
            const matchedSkill = resumeSkills.find(resumeSkill => 
                this._isSkillMatch(jdSkill, resumeSkill)
            );

            if (matchedSkill) {
                matchedSkills.push(jdSkill); // Use JD skill name for consistency
            } else {
                missingSkills.push(jdSkill);
            }
        });

        // Find extra skills not in JD
        const extraSkills = resumeSkills.filter(resumeSkill => 
            !jdSkills.some(jdSkill => this._isSkillMatch(jdSkill, resumeSkill))
        );

        // Calculate match percentage
        const matchScore = Math.round((matchedSkills.length / jdSkills.length) * 100);

        const result = {
            matchScore,
            matchedSkills: [...new Set(matchedSkills)], // Remove duplicates
            missingSkills,
            extraSkills,
            totalRequired: jdSkills.length,
            totalMatched: matchedSkills.length
        };
        
        console.log('Match calculation result:', result);
        return result;
    }

    /**
     * Calculate weighted match score with skill importance
     * @param {Array<Object>} jdSkills - Skills with weights [{skill, weight}]
     * @param {Array<string>} resumeSkills - Resume skills
     * @returns {Object} - Weighted match result
     */
    calculateWeightedMatch(jdSkills, resumeSkills) {
        let totalWeight = 0;
        let matchedWeight = 0;
        const matchedSkills = [];
        const missingSkills = [];

        jdSkills.forEach(({ skill, weight = 1 }) => {
            totalWeight += weight;
            
            const isMatched = resumeSkills.some(resumeSkill => 
                this._isSkillMatch(skill, resumeSkill)
            );

            if (isMatched) {
                matchedWeight += weight;
                matchedSkills.push(skill);
            } else {
                missingSkills.push({ skill, weight });
            }
        });

        const weightedScore = totalWeight > 0 ? 
            Math.round((matchedWeight / totalWeight) * 100) : 0;

        return {
            matchScore: weightedScore,
            weightedScore,
            matchedSkills,
            missingSkills,
            totalWeight,
            matchedWeight
        };
    }

    /**
     * Check if two skills match (improved fuzzy matching)
     * @private
     */
    _isSkillMatch(skill1, skill2) {
        const s1 = skill1.toLowerCase().trim();
        const s2 = skill2.toLowerCase().trim();
        
        // Exact match
        if (s1 === s2) return true;
        
        // Handle common variations first
        const variations = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'ml': 'machine learning',
            'ai': 'artificial intelligence',
            'c++': 'cpp',
            'c#': 'csharp'
        };
        
        const normalized1 = variations[s1] || s1;
        const normalized2 = variations[s2] || s2;
        
        if (normalized1 === normalized2) return true;
        
        // For very short skills (1-2 chars), only allow exact matches or known variations
        if (s1.length <= 2 || s2.length <= 2) {
            return false;
        }
        
        // Word boundary matching for longer skills
        // Only match if one skill is a complete word within the other
        const createWordRegex = (word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        
        // Check if skill1 is a complete word in skill2 or vice versa
        if (createWordRegex(s1).test(s2) || createWordRegex(s2).test(s1)) {
            return true;
        }
        
        // Additional check for normalized versions
        if (createWordRegex(normalized1).test(normalized2) || createWordRegex(normalized2).test(normalized1)) {
            return true;
        }
        
        return false;
    }
}

module.exports = MatchCalculator;