package com.smarttraining.evaluation.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class QuestionTypeConfigRequest {
    private Integer version = 1;
    private FillBlankConfig fillBlank;
    private OrderingConfig ordering;
    private MatchingConfig matching;
    private DragDropConfig dragDrop;
    private NumericConfig numeric;

    public QuestionTypeConfigRequest() {}
    public Integer getVersion(){return version;} public void setVersion(Integer version){this.version=version;}
    public FillBlankConfig getFillBlank(){return fillBlank;} public void setFillBlank(FillBlankConfig value){this.fillBlank=value;}
    public OrderingConfig getOrdering(){return ordering;} public void setOrdering(OrderingConfig value){this.ordering=value;}
    public MatchingConfig getMatching(){return matching;} public void setMatching(MatchingConfig value){this.matching=value;}
    public DragDropConfig getDragDrop(){return dragDrop;} public void setDragDrop(DragDropConfig value){this.dragDrop=value;}
    public NumericConfig getNumeric(){return numeric;} public void setNumeric(NumericConfig value){this.numeric=value;}
    public boolean hasNoSpecificConfig(){return fillBlank==null&&ordering==null&&matching==null&&dragDrop==null&&numeric==null;}

    public static class FillBlankConfig {
        private List<BlankRule> blanks = new ArrayList<>();
        public FillBlankConfig() {}
        public List<BlankRule> getBlanks(){return blanks;} public void setBlanks(List<BlankRule> value){this.blanks=value;}
    }
    public static class BlankRule {
        private String id; private List<String> accepted = new ArrayList<>(); private Boolean caseSensitive=false; private Boolean trim=true;
        public BlankRule() {}
        public String getId(){return id;} public void setId(String value){id=value;}
        public List<String> getAccepted(){return accepted;} public void setAccepted(List<String> value){accepted=value;}
        public Boolean getCaseSensitive(){return caseSensitive;} public void setCaseSensitive(Boolean value){caseSensitive=value;}
        public Boolean getTrim(){return trim;} public void setTrim(Boolean value){trim=value;}
    }
    public static class OrderingConfig {
        private List<OrderingItem> items = new ArrayList<>();
        public OrderingConfig() {}
        public List<OrderingItem> getItems(){return items;} public void setItems(List<OrderingItem> value){items=value;}
    }
    public static class OrderingItem {
        private String id; private String text; private Integer correctIndex;
        public OrderingItem() {}
        public String getId(){return id;} public void setId(String value){id=value;}
        public String getText(){return text;} public void setText(String value){text=value;}
        public Integer getCorrectIndex(){return correctIndex;} public void setCorrectIndex(Integer value){correctIndex=value;}
    }
    public static class MatchingConfig {
        private List<DisplayItem> left = new ArrayList<>(); private List<DisplayItem> right = new ArrayList<>(); private List<MatchingPair> pairs = new ArrayList<>();
        public MatchingConfig() {}
        public List<DisplayItem> getLeft(){return left;} public void setLeft(List<DisplayItem> value){left=value;}
        public List<DisplayItem> getRight(){return right;} public void setRight(List<DisplayItem> value){right=value;}
        public List<MatchingPair> getPairs(){return pairs;} public void setPairs(List<MatchingPair> value){pairs=value;}
    }
    public static class MatchingPair {
        private String leftId; private String rightId;
        public MatchingPair() {}
        public String getLeftId(){return leftId;} public void setLeftId(String value){leftId=value;}
        public String getRightId(){return rightId;} public void setRightId(String value){rightId=value;}
    }
    public static class DragDropConfig {
        private List<DisplayItem> items = new ArrayList<>(); private List<DisplayItem> zones = new ArrayList<>(); private List<DragPlacement> placements = new ArrayList<>();
        public DragDropConfig() {}
        public List<DisplayItem> getItems(){return items;} public void setItems(List<DisplayItem> value){items=value;}
        public List<DisplayItem> getZones(){return zones;} public void setZones(List<DisplayItem> value){zones=value;}
        public List<DragPlacement> getPlacements(){return placements;} public void setPlacements(List<DragPlacement> value){placements=value;}
    }
    public static class DragPlacement {
        private String itemId; private String zoneId;
        public DragPlacement() {}
        public String getItemId(){return itemId;} public void setItemId(String value){itemId=value;}
        public String getZoneId(){return zoneId;} public void setZoneId(String value){zoneId=value;}
    }
    public static class DisplayItem {
        private String id; private String text;
        public DisplayItem() {}
        public String getId(){return id;} public void setId(String value){id=value;}
        public String getText(){return text;} public void setText(String value){text=value;}
    }
    public static class NumericConfig {
        private BigDecimal expected; private BigDecimal tolerance=BigDecimal.ZERO; private String unit;
        public NumericConfig() {}
        public BigDecimal getExpected(){return expected;} public void setExpected(BigDecimal value){expected=value;}
        public BigDecimal getTolerance(){return tolerance;} public void setTolerance(BigDecimal value){tolerance=value;}
        public String getUnit(){return unit;} public void setUnit(String value){unit=value;}
    }
}
