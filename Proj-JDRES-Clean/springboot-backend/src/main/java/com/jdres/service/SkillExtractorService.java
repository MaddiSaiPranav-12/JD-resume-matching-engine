package com.jdres.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Skill Extractor Service
 * Extracts skills from text using OpenAI API with fallback to keyword matching
 */
@Service
public class SkillExtractorService {

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
        this.webClient = WebClient.builder()
                .baseUrl("https://api.openai.com/v1")
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
        try {
            String prompt = String.format(
                    "Extract technical skills from this text. Return only a JSON array of skills, no other text:\n\n%s\n\nExample format: [\"JavaScript\", \"Python\", \"AWS\"]",
                    text);

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", openaiModel);
            requestBody.put("messages", List.of(message));
            requestBody.put("max_tokens", 200);
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

                return objectMapper.readValue(content, new TypeReference<List<String>>() {
                });
            }
        } catch (Exception e) {
            System.err.println("OpenAI API error: " + e.getMessage());
        }

        // Fallback to keyword matching
        return mockSkillExtraction(text);
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
            System.err.println("OpenAI API error: " + e.getMessage());
        }

        // Fallback logic
        return fallbackSkillGapAnalysis(jdSkills, resumeSkills);
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

        // Return some default skills if none found (for demo purposes)
        if (foundSkills.isEmpty()) {
            return COMMON_SKILLS.subList(0, 3 + new Random().nextInt(3));
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
