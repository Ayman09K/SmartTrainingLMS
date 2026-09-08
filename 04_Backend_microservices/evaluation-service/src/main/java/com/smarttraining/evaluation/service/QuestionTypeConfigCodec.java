package com.smarttraining.evaluation.service;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
public class QuestionTypeConfigCodec {
    public static final int MAX_JSON_LENGTH = 12000;
    private final JsonMapper jsonMapper;
    public QuestionTypeConfigCodec(JsonMapper jsonMapper){this.jsonMapper=jsonMapper;}

    public String write(QuestionTypeConfigRequest config){
        if(config==null||config.hasNoSpecificConfig()) return null;
        try{
            String json=jsonMapper.writeValueAsString(config);
            if(json.length()>MAX_JSON_LENGTH) throw new IllegalArgumentException("La configuration de question depasse "+MAX_JSON_LENGTH+" caracteres.");
            return json;
        }catch(IllegalArgumentException e){throw e;}
        catch(Exception e){throw new IllegalArgumentException("Configuration de question JSON invalide.",e);}
    }

    public QuestionTypeConfigRequest read(String json){
        if(json==null||json.isBlank()) return null;
        try{return jsonMapper.readValue(json,QuestionTypeConfigRequest.class);}
        catch(Exception e){throw new IllegalStateException("Configuration de question persistee invalide.",e);}
    }
}
