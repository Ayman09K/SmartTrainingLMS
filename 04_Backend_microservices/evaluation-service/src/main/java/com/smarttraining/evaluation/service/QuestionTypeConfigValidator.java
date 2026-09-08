package com.smarttraining.evaluation.service;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.*;
import com.smarttraining.evaluation.enums.QuestionType;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class QuestionTypeConfigValidator {
    private static final int MAX_ITEMS=100;
    private static final int MAX_ID=80;
    private static final int MAX_TEXT=500;

    public void validate(QuestionType type,QuestionTypeConfigRequest config){
        if(type==null) throw new IllegalArgumentException("Le type de question est obligatoire.");
        switch(type){
            case SINGLE_CHOICE,MULTIPLE_CHOICE,TRUE_FALSE -> requireNoComplex(config);
            case FILL_BLANK -> validateFill(config);
            case ORDERING -> validateOrdering(config);
            case MATCHING -> validateMatching(config);
            case DRAG_DROP -> validateDrag(config);
            case NUMERIC -> validateNumeric(config);
        }
    }

    private void requireNoComplex(QuestionTypeConfigRequest c){
        if(c!=null&&!c.hasNoSpecificConfig()) throw new IllegalArgumentException("Ce type ne doit pas contenir de configuration complexe.");
    }
    private QuestionTypeConfigRequest require(QuestionTypeConfigRequest c){
        if(c==null) throw new IllegalArgumentException("Configuration du type obligatoire.");
        if(c.getVersion()==null||c.getVersion()!=1) throw new IllegalArgumentException("Version de configuration non supportee.");
        return c;
    }
    private void only(QuestionTypeConfigRequest c,String expected){
        int n=0;
        if(c.getFillBlank()!=null)n++; if(c.getOrdering()!=null)n++; if(c.getMatching()!=null)n++; if(c.getDragDrop()!=null)n++; if(c.getNumeric()!=null)n++;
        if(n!=1) throw new IllegalArgumentException("Une seule configuration specifique au type est autorisee.");
        boolean ok=switch(expected){
            case "FILL_BLANK"->c.getFillBlank()!=null;
            case "ORDERING"->c.getOrdering()!=null;
            case "MATCHING"->c.getMatching()!=null;
            case "DRAG_DROP"->c.getDragDrop()!=null;
            case "NUMERIC"->c.getNumeric()!=null;
            default->false;
        };
        if(!ok) throw new IllegalArgumentException("La configuration ne correspond pas au type.");
    }
    private void validateFill(QuestionTypeConfigRequest raw){
        QuestionTypeConfigRequest c=require(raw); only(c,"FILL_BLANK");
        List<BlankRule> blanks=c.getFillBlank().getBlanks();
        if(blanks==null||blanks.isEmpty()||blanks.size()>MAX_ITEMS) throw new IllegalArgumentException("FILL_BLANK requiert 1 a 100 blancs.");
        Set<String> ids=new HashSet<>();
        for(BlankRule b:blanks){
            String id=id(b==null?null:b.getId());
            if(!ids.add(id)) throw new IllegalArgumentException("blankId duplique: "+id);
            List<String> accepted=b.getAccepted();
            if(accepted==null||accepted.isEmpty()||accepted.size()>50) throw new IllegalArgumentException("Chaque blanc requiert 1 a 50 valeurs acceptees.");
            Set<String> vals=new HashSet<>();
            for(String v:accepted){
                String clean=text(v);
                String key=Boolean.TRUE.equals(b.getCaseSensitive())?clean:clean.toLowerCase(java.util.Locale.ROOT);
                if(!vals.add(key)) throw new IllegalArgumentException("Valeur acceptee dupliquee pour "+id);
            }
        }
    }
    private void validateOrdering(QuestionTypeConfigRequest raw){
        QuestionTypeConfigRequest c=require(raw); only(c,"ORDERING");
        List<OrderingItem> items=c.getOrdering().getItems();
        if(items==null||items.size()<2||items.size()>MAX_ITEMS) throw new IllegalArgumentException("ORDERING requiert 2 a 100 elements.");
        Set<String> ids=new HashSet<>(); Set<Integer> indexes=new HashSet<>();
        for(OrderingItem item:items){
            String id=id(item==null?null:item.getId()); text(item.getText());
            if(!ids.add(id)) throw new IllegalArgumentException("ID ORDERING duplique: "+id);
            Integer index=item.getCorrectIndex();
            if(index==null||index<0||index>=items.size()||!indexes.add(index)) throw new IllegalArgumentException("correctIndex ORDERING doit etre unique de 0 a n-1.");
        }
    }
    private void validateMatching(QuestionTypeConfigRequest raw){
        QuestionTypeConfigRequest c=require(raw); only(c,"MATCHING");
        List<DisplayItem> left=c.getMatching().getLeft(),right=c.getMatching().getRight();
        display(left,"MATCHING left",2); display(right,"MATCHING right",2);
        List<MatchingPair> pairs=c.getMatching().getPairs();
        if(pairs==null||pairs.size()!=left.size()) throw new IllegalArgumentException("MATCHING requiert une paire par element gauche.");
        Set<String> leftIds=ids(left),rightIds=ids(right),seenL=new HashSet<>(),seenR=new HashSet<>();
        for(MatchingPair p:pairs){
            String l=id(p==null?null:p.getLeftId()),r=id(p.getRightId());
            if(!leftIds.contains(l)||!rightIds.contains(r)) throw new IllegalArgumentException("Paire MATCHING inconnue.");
            if(!seenL.add(l)||!seenR.add(r)) throw new IllegalArgumentException("Paires MATCHING non bijectives.");
        }
    }
    private void validateDrag(QuestionTypeConfigRequest raw){
        QuestionTypeConfigRequest c=require(raw); only(c,"DRAG_DROP");
        List<DisplayItem> items=c.getDragDrop().getItems(),zones=c.getDragDrop().getZones();
        display(items,"DRAG_DROP items",1); display(zones,"DRAG_DROP zones",1);
        List<DragPlacement> placements=c.getDragDrop().getPlacements();
        if(placements==null||placements.size()!=items.size()) throw new IllegalArgumentException("DRAG_DROP requiert un placement correct par element.");
        Set<String> itemIds=ids(items),zoneIds=ids(zones),seen=new HashSet<>();
        for(DragPlacement p:placements){
            String item=id(p==null?null:p.getItemId()),zone=id(p.getZoneId());
            if(!itemIds.contains(item)||!zoneIds.contains(zone)) throw new IllegalArgumentException("Placement DRAG_DROP inconnu.");
            if(!seen.add(item)) throw new IllegalArgumentException("Placement DRAG_DROP duplique.");
        }
    }
    private void validateNumeric(QuestionTypeConfigRequest raw){
        QuestionTypeConfigRequest c=require(raw); only(c,"NUMERIC");
        BigDecimal expected=c.getNumeric().getExpected(),tol=c.getNumeric().getTolerance();
        if(expected==null) throw new IllegalArgumentException("NUMERIC requiert expected.");
        if(tol==null||tol.compareTo(BigDecimal.ZERO)<0) throw new IllegalArgumentException("NUMERIC tolerance doit etre >= 0.");
        if(c.getNumeric().getUnit()!=null&&c.getNumeric().getUnit().length()>40) throw new IllegalArgumentException("Unite NUMERIC trop longue.");
    }
    private void display(List<DisplayItem> values,String label,int min){
        if(values==null||values.size()<min||values.size()>MAX_ITEMS) throw new IllegalArgumentException(label+" taille invalide.");
        Set<String> ids=new HashSet<>();
        for(DisplayItem i:values){String id=id(i==null?null:i.getId()); text(i.getText()); if(!ids.add(id)) throw new IllegalArgumentException(label+" ID duplique: "+id);}
    }
    private Set<String> ids(List<DisplayItem> values){Set<String>s=new HashSet<>();for(DisplayItem i:values)s.add(id(i.getId()));return s;}
    private String id(String v){if(v==null||v.isBlank()||v.length()>MAX_ID)throw new IllegalArgumentException("Identifiant de configuration invalide.");return v.trim();}
    private String text(String v){if(v==null||v.isBlank()||v.length()>MAX_TEXT)throw new IllegalArgumentException("Texte de configuration invalide.");return v.trim();}
}
