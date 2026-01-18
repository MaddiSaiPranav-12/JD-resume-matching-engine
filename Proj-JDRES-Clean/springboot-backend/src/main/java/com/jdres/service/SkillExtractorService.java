package com.jdres.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.YearMonth;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Skill Extractor Service
 * Extracts skills from text using OpenAI API with fallback to keyword matching
 */
@Service
public class SkillExtractorService {

    private static final Logger log = LoggerFactory.getLogger(SkillExtractorService.class);

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${openai.api-key}")
    private String openaiApiKey;

    @Value("${openai.model}")
    private String openaiModel;

    private static final List<String> COMMON_SKILLS = Arrays.asList(
            "JavaScript", "Python", "Java", "React", "Node.js", "SQL", "MongoDB",
            "AWS", "Docker", "Kubernetes", "Git", "REST API", "GraphQL", "HTML", "CSS",
            "TypeScript", "Angular", "Vue.js", "Express", "Spring", "Django", "Flask",
            "PostgreSQL", "MySQL", "Redis", "Elasticsearch", "Jenkins", "CI/CD",
            "Microservices", "API", "JSON", "XML", "Linux", "Windows", "MacOS",
            "Agile", "Scrum", "DevOps", "Cloud", "Azure", "GCP", "Terraform");

    public SkillExtractorService() {
        // Simple WebClient configuration (avoid custom Netty client to prevent DNS
        // issues on macOS)
        this.webClient = WebClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(2 * 1024 * 1024)) // 2MB buffer
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Extract skills from text using OpenAI API
     * 
     * @param text - Text to extract skills from
     * @return List of extracted skills
     */
    public List<String> extractSkills(String text) {
        Map<String, Object> details = extractResumeDetails(text);
        // If details are empty (API failed), fallback to keyword extraction directly
        // here
        if (details == null || details.isEmpty()) {
            return mockSkillExtraction(text);
        }

        List<String> flattened = flattenSkills(details);
        if (flattened.isEmpty()) {
            return mockSkillExtraction(text);
        }
        return flattened;
    }

    /**
     * Extract structured details from resume text using OpenAI API
     */
    public Map<String, Object> extractResumeDetails(String text) {
        try {
            String schema = "{\n" +
                    "  \"candidate_profile\": {\n" +
                    "    \"name\": \"\",\n" +
                    "    \"email\": \"\",\n" +
                    "    \"phone\": \"\",\n" +
                    "    \"location\": \"\"\n" +
                    "  },\n" +
                    "\n" +
                    "  \"summary\": \"\",\n" +
                    "\n" +
                    "  \"skills\": {\n" +
                    "    \"primary\": [],\n" +
                    "    \"secondary\": [],\n" +
                    "    \"tools\": [],\n" +
                    "    \"databases\": [],\n" +
                    "    \"cloud\": []\n" +
                    "  },\n" +
                    "\n" +
                    "  \"total_experience_years\": 0,\n" +
                    "\n" +
                    "  \"work_experience\": [\n" +
                    "    {\n" +
                    "      \"job_title\": \"\",\n" +
                    "      \"company\": \"\",\n" +
                    "      \"start_date\": \"YYYY-MM\",\n" +
                    "      \"end_date\": \"YYYY-MM or PRESENT\",\n" +
                    "      \"duration_months\": 0,\n" +
                    "      \"responsibilities\": [],\n" +
                    "      \"technologies_used\": []\n" +
                    "    }\n" +
                    "  ],\n" +
                    "\n" +
                    "  \"education\": [\n" +
                    "    {\n" +
                    "      \"degree\": \"\",\n" +
                    "      \"field_of_study\": \"\",\n" +
                    "      \"institution\": \"\",\n" +
                    "      \"graduation_year\": 0,\n" +
                    "      \"end_date\": \"YYYY-MM\"\n" +
                    "    }\n" +
                    "  ],\n" +
                    "\n" +
                    "  \"projects\": [\n" +
                    "    {\n" +
                    "      \"project_name\": \"\",\n" +
                    "      \"description\": \"\",\n" +
                    "      \"technologies_used\": [],\n" +
                    "      \"role\": \"\"\n" +
                    "    }\n" +
                    "  ],\n" +
                    "\n" +
                    "  \"certifications\": [],\n" +
                    "\n" +
                    "  \"domain_experience\": [],\n" +
                    "\n" +
                    "  \"keywords\": [],\n" +
                    "\n" +
                    "  \"employment_gaps\": {\n" +
                    "    \"has_gap\": false,\n" +
                    "    \"total_gap_months\": 0,\n" +
                    "    \"gap_details\": []\n" +
                    "  }\n" +
                    "}";

            String prompt = String.format(
                    "You are an expert ATS resume parser.\n\n" +
                            "Your task:\n" +
                            "- Extract structured data useful for job–resume matching\n" +
                            "- Extract the candidate's Full Name (usually at the top), Email, and Location\n" +
                            "- Extract skills, experience, projects, education, and dates accurately\n" +
                            "- Normalize skill names (e.g., React.js → React)\n" +
                            "- Extract dates strictly in YYYY-MM format\n\n" +
                            "STRICT RULES:\n" +
                            "- DO NOT infer or assume employment gaps\n" +
                            "- DO NOT infer skills not explicitly mentioned\n" +
                            "- DO NOT add explanations or comments\n" +
                            "- If data is missing, use empty string, empty array, or 0\n\n" +
                            "Output requirements:\n" +
                            "- Output ONLY valid JSON\n" +
                            "- Follow the provided schema exactly\n" +
                            "- No additional keys.\n\n" +
                            "Schema:\n%s\n\n" +
                            "Resume Text:\n%s",
                    schema, text);

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", openaiModel);
            requestBody.put("messages", List.of(message));
            requestBody.put("max_tokens", 2500); // Increased for larger schema
            requestBody.put("temperature", 0.0); // Strict info extraction

            String response = webClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + openaiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (response != null) {
                JsonNode root = objectMapper.readTree(response);
                String content = root.path("choices").get(0).path("message").path("content").asText().trim();

                // Remove markdown code blocks if present
                content = content.replaceAll("```json\\s*|```\\s*", "");

                Map<String, Object> parsedDetails = objectMapper.readValue(content,
                        new TypeReference<Map<String, Object>>() {
                        });

                // Post-process for Gaps
                calculateEmploymentGaps(parsedDetails);

                return parsedDetails;
            }
        } catch (Exception e) {
            log.error("OpenAI API error extracting details: {}", e.getMessage());
        }

        // Fallback: Empty map or basic keyword extraction
        return new HashMap<>();
    }

    /**
     * Extract structured details from Job Description text using OpenAI API
     */
    public Map<String, Object> extractJobDescriptionDetails(String text) {
        try {
            String schema = "{\n" +
                    "  \"job_profile\": {\n" +
                    "    \"job_title\": \"\",\n" +
                    "    \"department\": \"\",\n" +
                    "    \"location\": \"\",\n" +
                    "    \"employment_type\": \"\"\n" +
                    "  },\n" +
                    "\n" +
                    "  \"required_experience_years\": 0,\n" +
                    "\n" +
                    "  \"skills\": {\n" +
                    "    \"mandatory\": [],\n" +
                    "    \"preferred\": [],\n" +
                    "    \"tools\": [],\n" +
                    "    \"databases\": [],\n" +
                    "    \"cloud\": []\n" +
                    "  },\n" +
                    "\n" +
                    "  \"responsibilities\": [],\n" +
                    "\n" +
                    "  \"nice_to_have\": [],\n" +
                    "\n" +
                    "  \"education_requirements\": [],\n" +
                    "\n" +
                    "  \"domain\": [],\n" +
                    "\n" +
                    "  \"keywords\": []\n" +
                    "}";

            String prompt = String.format(
                    "You are an expert recruiter assistant.\n\n" +
                            "Your task:\n" +
                            "- Extract structured requirements from job descriptions\n" +
                            "- Identify mandatory vs preferred skills\n" +
                            "- Normalize skill names\n" +
                            "- Extract minimum experience requirements\n\n" +
                            "STRICT RULES:\n" +
                            "- DO NOT infer requirements not explicitly stated\n" +
                            "- DO NOT add explanations\n" +
                            "- Output ONLY valid JSON\n" +
                            "- Follow the schema exactly.\n\n" +
                            "Schema:\n%s\n\n" +
                            "Job Description:\n%s",
                    schema, text);

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", openaiModel);
            requestBody.put("messages", List.of(message));
            requestBody.put("max_tokens", 1500);
            requestBody.put("temperature", 0.1);

            String response = webClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + openaiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (response != null) {
                JsonNode root = objectMapper.readTree(response);
                String content = root.path("choices").get(0).path("message").path("content").asText().trim();
                content = content.replaceAll("```json\\s*|```\\s*", "");
                return objectMapper.readValue(content, new TypeReference<Map<String, Object>>() {
                });
            }
        } catch (Exception e) {
            log.error("OpenAI API error extracting JD details: {}", e.getMessage());
        }
        return new HashMap<>();
    }

    @SuppressWarnings("unchecked")
    public List<String> flattenSkills(Map<String, Object> details) {
        List<String> allSkills = new ArrayList<>();
        if (details == null || !details.containsKey("skills"))
            return allSkills; // Return empty, caller handles fallback

        try {
            Map<String, Object> skillsMap = (Map<String, Object>) details.get("skills");
            if (skillsMap != null) {
                skillsMap.values().forEach(val -> {
                    if (val instanceof List) {
                        allSkills.addAll((List<String>) val);
                    }
                });
            }
        } catch (Exception e) {
            log.warn("Error flattening skills: {}", e.getMessage());
        }

        return allSkills.stream().distinct().toList();
    }

    /**
     * Analyze skill gap between JD and Resume skills
     * 
     * @param jdSkills     - Required skills from job description
     * @param resumeSkills - Skills from candidate resume
     * @return Skill gap analysis result
     */
    public Map<String, Object> analyzeSkillGap(List<String> jdSkills, List<String> resumeSkills) {
        try {
            String prompt = String.format(
                    "Analyze skill gap between:\nRequired: %s\nCandidate: %s\n\nReturn JSON with matched, missing, and analysis:\n{\"matchedSkills\": [], \"missingSkills\": [], \"gapAnalysis\": \"text\"}",
                    String.join(", ", jdSkills),
                    String.join(", ", resumeSkills));

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", openaiModel);
            requestBody.put("messages", List.of(message));
            requestBody.put("max_tokens", 300);
            requestBody.put("temperature", 0.3);

            String response = webClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + openaiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (response != null) {
                JsonNode root = objectMapper.readTree(response);
                String content = root.path("choices").get(0).path("message").path("content").asText().trim();

                // Remove markdown code blocks if present
                content = content.replaceAll("```json\\s*|```\\s*", "");

                return objectMapper.readValue(content, new TypeReference<Map<String, Object>>() {
                });
            }
        } catch (Exception e) {
            log.error("OpenAI API error: {}", e.getMessage());
        }

        // Fallback logic
        return fallbackSkillGapAnalysis(jdSkills, resumeSkills);
    }

    /**
     * Parse "YYYY-MM" or "PRESENT" or invalid
     */
    private YearMonth parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty())
            return null;
        if (dateStr.toUpperCase().contains("PRESENT") || dateStr.toUpperCase().contains("CURRENT")
                || dateStr.toUpperCase().contains("NOW")) {
            return YearMonth.now();
        }
        try {
            return YearMonth.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM"));
        } catch (Exception e) {
            return null;
        }
    }

    private void calculateEmploymentGaps(Map<String, Object> resumeData) {
        try {
            // 1. Get Work Experience
            List<Map<String, Object>> workExperience = (List<Map<String, Object>>) resumeData.get("work_experience");
            if (workExperience == null)
                workExperience = new ArrayList<>();

            // Sort by start_date
            workExperience.sort((a, b) -> {
                YearMonth da = parseDate((String) a.get("start_date"));
                YearMonth db = parseDate((String) b.get("start_date"));
                if (da == null && db == null)
                    return 0;
                if (da == null)
                    return 1;
                if (db == null)
                    return -1;
                return da.compareTo(db);
            });

            long totalGapMonths = 0;
            List<Map<String, Object>> gapDetails = new ArrayList<>();

            // 2. Check POST_COLLEGE gap
            List<Map<String, Object>> education = (List<Map<String, Object>>) resumeData.get("education");
            if (education != null && !education.isEmpty() && !workExperience.isEmpty()) {
                // Find latest graduation date
                YearMonth latestGrad = null;
                for (Map<String, Object> edu : education) {
                    String endDateStr = (String) edu.get("end_date");
                    // Sometimes graduation_year is number
                    if (endDateStr == null && edu.get("graduation_year") != null) {
                        endDateStr = edu.get("graduation_year") + "-06"; // Assume June
                    }
                    YearMonth end = parseDate(endDateStr);
                    if (end != null) {
                        if (latestGrad == null || end.isAfter(latestGrad)) {
                            latestGrad = end;
                        }
                    }
                }

                YearMonth firstJobStart = parseDate((String) workExperience.get(0).get("start_date"));

                if (latestGrad != null && firstJobStart != null) {
                    long months = ChronoUnit.MONTHS.between(latestGrad, firstJobStart);
                    if (months >= 6) {
                        Map<String, Object> gap = new HashMap<>();
                        gap.put("gap_type", "POST_COLLEGE");
                        gap.put("start_date", latestGrad.toString());
                        gap.put("end_date", firstJobStart.toString());
                        gap.put("duration_months", months);
                        gapDetails.add(gap);
                        totalGapMonths += months;
                    }
                }
            }

            // 3. Check BETWEEN_JOBS gaps
            for (int i = 0; i < workExperience.size() - 1; i++) {
                Map<String, Object> currentJob = workExperience.get(i);
                Map<String, Object> nextJob = workExperience.get(i + 1);

                YearMonth currentEnd = parseDate((String) currentJob.get("end_date"));
                YearMonth nextStart = parseDate((String) nextJob.get("start_date"));

                if (currentEnd != null && nextStart != null) {
                    long months = ChronoUnit.MONTHS.between(currentEnd, nextStart);
                    if (months >= 6) {
                        Map<String, Object> gap = new HashMap<>();
                        gap.put("gap_type", "BETWEEN_JOBS");
                        gap.put("start_date", currentEnd.toString());
                        gap.put("end_date", nextStart.toString());
                        gap.put("duration_months", months);
                        gapDetails.add(gap);
                        totalGapMonths += months;
                    }
                }
            }

            Map<String, Object> gaps = new HashMap<>();
            gaps.put("has_gap", totalGapMonths > 0);
            gaps.put("total_gap_months", totalGapMonths);
            gaps.put("gap_details", gapDetails);

            resumeData.put("employment_gaps", gaps);

        } catch (Exception e) {
            log.error("Error calculating employment gaps: " + e.getMessage());
        }
    }

    /**
     * Fallback skill extraction using keyword matching
     */
    private List<String> mockSkillExtraction(String text) {
        String textLower = text.toLowerCase();
        List<String> foundSkills = new ArrayList<>();

        for (String skill : COMMON_SKILLS) {
            String skillLower = skill.toLowerCase();
            if (textLower.contains(skillLower) ||
                    textLower.contains(skillLower.replace(".", "")) ||
                    textLower.contains(skillLower.replace(" ", ""))) {
                foundSkills.add(skill);
            }
        }

        // If no skills are found via keyword matching, return an empty list
        if (foundSkills.isEmpty()) {
            log.warn("Fallback keyword skill extraction found no skills; returning empty list.");
            return Collections.emptyList();
        }

        return foundSkills;
    }

    /**
     * Fallback skill gap analysis
     */
    private Map<String, Object> fallbackSkillGapAnalysis(List<String> jdSkills, List<String> resumeSkills) {
        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        for (String jdSkill : jdSkills) {
            boolean found = resumeSkills.stream()
                    .anyMatch(resumeSkill -> resumeSkill.toLowerCase().contains(jdSkill.toLowerCase()));
            if (found) {
                matched.add(jdSkill);
            } else {
                missing.add(jdSkill);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("matchedSkills", matched);
        result.put("missingSkills", missing);
        result.put("gapAnalysis", "Fallback analysis");
        return result;
    }
}
